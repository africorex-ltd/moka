import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, Modal,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { exportMilkBoardExcel, exportHerdDataExcel, exportBreedingLogExcel } from '@/lib/exportExcel'
import { exportMilkBoardPDF, exportFarmPLPDF } from '@/lib/exportPDF'
import { pickExcelFile, readExcelFile, importMilkData, importHerdData } from '@/lib/importExcel'
import { pickAndScanRecord, applyScannedMilkRecords } from '@/lib/importScan'

type ImportStep = 'idle' | 'mapping' | 'preview' | 'done'

export default function DataManagementScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('idle')
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importType, setImportType] = useState<'milk' | 'herd'>('milk')
  const [colMap, setColMap] = useState<Record<string, string>>({})
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [scanModal, setScanModal] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [scanResult, setScanResult] = useState<Awaited<ReturnType<typeof pickAndScanRecord>> | null>(null)

  const today = dayjs()
  const month = today.format('YYYY-MM')

  async function doExport(label: string, fn: () => Promise<void>) {
    setLoading(label)
    try {
      await fn()
    } catch (e: unknown) {
      Alert.alert('Export failed', (e as Error).message)
    }
    setLoading(null)
  }

  async function exportMilkExcel() {
    const cows = await db.getAllAsync<{ local_id: string; name: string }>(
      `SELECT local_id, name FROM cows WHERE deleted = 0 ORDER BY name`
    )
    const start = today.startOf('month').format('YYYY-MM-DD')
    const end = today.endOf('month').format('YYYY-MM-DD')
    const rows = await db.getAllAsync<{ cow_local_id: string; date: string; total: number }>(
      `SELECT cow_local_id, date, COALESCE(SUM(quantity_litres), 0) as total FROM milk_log WHERE date BETWEEN ? AND ? AND deleted = 0 GROUP BY cow_local_id, date`,
      [start, end]
    )
    const data: Record<string, Record<string, number>> = {}
    for (const r of rows) {
      if (!data[r.date]) data[r.date] = {}
      data[r.date][r.cow_local_id] = r.total
    }
    await exportMilkBoardExcel(month, cows, data)
  }

  async function exportMilkPDF() {
    const cows = await db.getAllAsync<{ local_id: string; name: string }>(
      `SELECT local_id, name FROM cows WHERE deleted = 0 ORDER BY name`
    )
    const start = today.startOf('month').format('YYYY-MM-DD')
    const end = today.endOf('month').format('YYYY-MM-DD')
    const rows = await db.getAllAsync<{ cow_local_id: string; date: string; total: number }>(
      `SELECT cow_local_id, date, COALESCE(SUM(quantity_litres), 0) as total FROM milk_log WHERE date BETWEEN ? AND ? AND deleted = 0 GROUP BY cow_local_id, date`,
      [start, end]
    )
    const data: Record<string, Record<string, number>> = {}
    for (const r of rows) {
      if (!data[r.date]) data[r.date] = {}
      data[r.date][r.cow_local_id] = r.total
    }
    await exportMilkBoardPDF(month, cows, data)
  }

  async function exportHerd() {
    const cows = await db.getAllAsync<{
      name: string; breed: string; status: string; date_of_birth: string | null
      ear_tag: string | null; sire_code: string | null; live_weight_kg: number | null; body_condition_score: number | null
    }>(`SELECT name, breed, status, date_of_birth, ear_tag, sire_code, live_weight_kg, body_condition_score FROM cows WHERE deleted = 0 ORDER BY name`)
    await exportHerdDataExcel(cows)
  }

  async function exportBreeding() {
    const entries = await db.getAllAsync<{
      cow_name: string; date: string; event_type: string
      sire_code: string | null; expected_calving_date: string | null
      pd_result: string | null; actual_calving_date: string | null; notes: string | null
    }>(
      `SELECT c.name as cow_name, b.date, b.event_type, b.sire_code, b.expected_calving_date, b.pd_result, b.actual_calving_date, b.notes
       FROM breeding_log b JOIN cows c ON b.cow_local_id = c.local_id WHERE b.deleted = 0 ORDER BY b.date DESC`
    )
    await exportBreedingLogExcel(entries)
  }

  async function exportPL() {
    const start = today.startOf('month').format('YYYY-MM-DD')
    const end = today.endOf('month').format('YYYY-MM-DD')
    const [rev, feed, health, farm, litres] = await Promise.all([
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_litres * price_per_litre), 0) as v FROM milk_sales WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_kg * cost_per_kg), 0) as v FROM feeding_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(cost), 0) as v FROM health_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(amount), 0) as v FROM farm_costs WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_litres), 0) as v FROM milk_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
    ])
    const topCows = await db.getAllAsync<{ name: string; litres: number }>(
      `SELECT c.name, COALESCE(SUM(m.quantity_litres), 0) as litres FROM milk_log m JOIN cows c ON m.cow_local_id = c.local_id WHERE m.date BETWEEN ? AND ? AND m.deleted = 0 GROUP BY m.cow_local_id ORDER BY litres DESC`,
      [start, end]
    )
    await exportFarmPLPDF({ month, revenue: rev?.v ?? 0, costs: { feed: feed?.v ?? 0, health: health?.v ?? 0, farm: farm?.v ?? 0 }, litres: litres?.v ?? 0, topCows })
  }

  async function startImport(type: 'milk' | 'herd') {
    setImportType(type)
    const file = await pickExcelFile()
    if (!file) return
    setLoading('Reading file…')
    try {
      const { headers, rows } = await readExcelFile(file.uri)
      setImportHeaders(headers)
      setImportRows(rows)
      const defaultMap: Record<string, string> = {}
      if (type === 'milk') {
        defaultMap.cow = headers.find((h) => /cow|name/i.test(h)) ?? headers[0] ?? ''
        defaultMap.date = headers.find((h) => /date/i.test(h)) ?? headers[1] ?? ''
        defaultMap.litres = headers.find((h) => /litre|liter|milk|qty|quantity/i.test(h)) ?? headers[2] ?? ''
      } else {
        defaultMap.name = headers.find((h) => /name/i.test(h)) ?? headers[0] ?? ''
        defaultMap.breed = headers.find((h) => /breed/i.test(h)) ?? ''
        defaultMap.dob = headers.find((h) => /dob|birth|born/i.test(h)) ?? ''
        defaultMap.earTag = headers.find((h) => /tag|ear/i.test(h)) ?? ''
        defaultMap.status = headers.find((h) => /status/i.test(h)) ?? ''
      }
      setColMap(defaultMap)
      setImportStep('mapping')
    } catch (e: unknown) {
      Alert.alert('Error reading file', (e as Error).message)
    }
    setLoading(null)
  }

  async function runImport() {
    setLoading('Importing…')
    let result
    try {
      if (importType === 'milk') {
        result = await importMilkData(importRows, { cow: colMap.cow, date: colMap.date, litres: colMap.litres }, db)
      } else {
        result = await importHerdData(importRows, { name: colMap.name, breed: colMap.breed, dob: colMap.dob, earTag: colMap.earTag, status: colMap.status }, db)
      }
      setImportResult(result)
      setImportStep('done')
    } catch (e: unknown) {
      Alert.alert('Import failed', (e as Error).message)
    }
    setLoading(null)
  }

  async function runScan() {
    if (!apiKey.trim()) {
      Alert.alert('API key required', 'Enter your Anthropic API key to use camera scan.')
      return
    }
    setScanModal(false)
    setLoading('Scanning…')
    try {
      const result = await pickAndScanRecord(apiKey.trim())
      setScanResult(result)
      if (result) {
        Alert.alert(
          `Scanned: ${result.type} (${result.confidence} confidence)`,
          `Found ${result.rows.length} records. ${result.notes}`,
          [
            { text: 'Discard', style: 'cancel', onPress: () => setScanResult(null) },
            {
              text: 'Import milk records',
              onPress: async () => {
                if (result.type !== 'milk') { Alert.alert('Not milk records', 'This scan contains ' + result.type + ' data.'); return }
                const r = await applyScannedMilkRecords(result, db)
                Alert.alert('Done', `Imported ${r.imported} records. ${r.errors.length > 0 ? 'Errors: ' + r.errors.slice(0, 3).join(', ') : ''}`)
              },
            },
          ]
        )
      }
    } catch (e: unknown) {
      Alert.alert('Scan failed', (e as Error).message)
    }
    setLoading(null)
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Data & Reports</Text>
      </View>

      {loading && (
        <View className="absolute inset-0 bg-black/30 z-50 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 items-center gap-3">
            <ActivityIndicator color="#2D5016" size="large" />
            <Text className="text-moka-dark font-semibold">{loading}</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Export section */}
        <Text className="text-moka-dark font-bold text-base px-1">Export</Text>

        <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <SectionHeader title="Milk Production" icon="water-outline" color="#2D5016" />
          <ExportRow label={`Milk board ${today.format('MMM YYYY')} — Excel`} icon="grid-outline" onPress={() => doExport('Exporting Excel…', exportMilkExcel)} />
          <ExportRow label={`Milk board ${today.format('MMM YYYY')} — PDF`} icon="document-text-outline" onPress={() => doExport('Generating PDF…', exportMilkPDF)} last />
        </View>

        <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <SectionHeader title="Reports" icon="stats-chart-outline" color="#B8860B" />
          <ExportRow label={`Farm P&L ${today.format('MMM YYYY')} — PDF`} icon="document-text-outline" onPress={() => doExport('Generating PDF…', exportPL)} />
          <ExportRow label="Herd data — Excel" icon="grid-outline" onPress={() => doExport('Exporting herd…', exportHerd)} />
          <ExportRow label="Breeding log — Excel" icon="heart-circle-outline" onPress={() => doExport('Exporting breeding…', exportBreeding)} last />
        </View>

        {/* Import section */}
        <Text className="text-moka-dark font-bold text-base px-1 mt-2">Import</Text>

        {importStep === 'idle' && (
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <SectionHeader title="Import from file" icon="cloud-upload-outline" color="#9B59B6" />
            <ExportRow label="Import milk records (Excel/CSV)" icon="water-outline" onPress={() => startImport('milk')} />
            <ExportRow label="Import herd data (Excel/CSV)" icon="paw-outline" onPress={() => startImport('herd')} last />
          </View>
        )}

        {importStep === 'mapping' && (
          <View className="bg-white rounded-2xl shadow-sm p-4 gap-3">
            <Text className="text-moka-dark font-bold text-sm">Map columns ({importRows.length} rows found)</Text>
            <Text className="text-moka-text text-xs">{importType === 'milk' ? 'Map the Excel columns to milk log fields.' : 'Map columns to cow fields.'}</Text>
            {importType === 'milk' && (
              <>
                <ColMapper label="Cow name column" value={colMap.cow} headers={importHeaders} onChange={(v) => setColMap({ ...colMap, cow: v })} />
                <ColMapper label="Date column" value={colMap.date} headers={importHeaders} onChange={(v) => setColMap({ ...colMap, date: v })} />
                <ColMapper label="Litres column" value={colMap.litres} headers={importHeaders} onChange={(v) => setColMap({ ...colMap, litres: v })} />
              </>
            )}
            {importType === 'herd' && (
              <>
                <ColMapper label="Name column *" value={colMap.name} headers={importHeaders} onChange={(v) => setColMap({ ...colMap, name: v })} />
                <ColMapper label="Breed column" value={colMap.breed} headers={['(none)', ...importHeaders]} onChange={(v) => setColMap({ ...colMap, breed: v })} />
                <ColMapper label="DOB column" value={colMap.dob} headers={['(none)', ...importHeaders]} onChange={(v) => setColMap({ ...colMap, dob: v })} />
                <ColMapper label="Ear tag column" value={colMap.earTag} headers={['(none)', ...importHeaders]} onChange={(v) => setColMap({ ...colMap, earTag: v })} />
              </>
            )}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity className="flex-1 border border-gray-200 rounded-xl py-3 items-center" onPress={() => setImportStep('idle')}>
                <Text className="text-moka-mid text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-moka-green rounded-xl py-3 items-center" onPress={runImport}>
                <Text className="text-white font-bold text-sm">Import {importRows.length} rows</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {importStep === 'done' && importResult && (
          <View className="bg-white rounded-2xl shadow-sm p-4 gap-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={22} color="#27AE60" />
              <Text className="text-moka-dark font-bold">Import complete</Text>
            </View>
            <Text className="text-moka-dark">{importResult.imported} records imported</Text>
            {importResult.skipped > 0 && <Text className="text-moka-text text-sm">{importResult.skipped} rows skipped</Text>}
            {importResult.errors.slice(0, 5).map((e, i) => (
              <Text key={i} className="text-red-500 text-xs">{e}</Text>
            ))}
            <TouchableOpacity className="bg-moka-light rounded-xl py-3 items-center" onPress={() => { setImportStep('idle'); setImportResult(null) }}>
              <Text className="text-moka-green font-semibold">Import another file</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Camera scan */}
        <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <SectionHeader title="Camera Scan (AI)" icon="camera-outline" color="#1ABC9C" />
          <TouchableOpacity
            className="flex-row items-center px-4 py-4 gap-3"
            onPress={() => setScanModal(true)}
          >
            <Ionicons name="scan-outline" size={20} color="#1ABC9C" />
            <View className="flex-1">
              <Text className="text-moka-dark text-sm font-semibold">Scan farm record photo</Text>
              <Text className="text-moka-text text-xs">Uses AI to extract milk/health/breeding data from photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8A9E80" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* API key modal for scan */}
      <Modal visible={scanModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 gap-4">
            <Text className="text-moka-dark font-bold text-lg">AI Camera Scan</Text>
            <Text className="text-moka-text text-sm">Enter your Anthropic API key to use the AI scan feature. The key is only used locally and never stored.</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="sk-ant-..."
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 border border-gray-200 rounded-xl py-3 items-center" onPress={() => setScanModal(false)}>
                <Text className="text-moka-mid">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-moka-green rounded-xl py-3 items-center" onPress={runScan}>
                <Text className="text-white font-bold">Open Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function SectionHeader({ title, icon, color }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-100 gap-2">
      <Ionicons name={icon} size={16} color={color} />
      <Text className="text-moka-dark font-bold text-sm">{title}</Text>
    </View>
  )
}

function ExportRow({ label, icon, onPress, last }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-3.5 gap-3 ${last ? '' : 'border-b border-gray-100'}`}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color="#8A9E80" />
      <Text className="flex-1 text-moka-dark text-sm">{label}</Text>
      <Ionicons name="share-outline" size={16} color="#8A9E80" />
    </TouchableOpacity>
  )
}

function ColMapper({ label, value, headers, onChange }: { label: string; value: string; headers: string[]; onChange: (v: string) => void }) {
  return (
    <View>
      <Text className="text-moka-mid text-xs mb-1">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {headers.map((h) => (
            <TouchableOpacity
              key={h}
              className={`px-3 py-2 rounded-full border ${value === h ? 'bg-moka-green border-moka-green' : 'border-gray-200 bg-white'}`}
              onPress={() => onChange(h)}
            >
              <Text className={`text-xs font-medium ${value === h ? 'text-white' : 'text-moka-mid'}`}>{h || '(empty)'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
