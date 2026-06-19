import * as XLSX from 'xlsx'
import * as FileSystem from 'expo-file-system/legacy'
import * as DocumentPicker from 'expo-document-picker'
import { generateId } from './database'

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

export interface MappedRow {
  name?: string
  date?: string
  quantity?: number
  notes?: string
  [key: string]: string | number | undefined
}

export async function pickExcelFile(): Promise<{ uri: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'application/vnd.ms-excel',
           'text/csv',
           '*/*'],
    copyToCacheDirectory: true,
  })
  if (result.canceled || !result.assets?.[0]) return null
  return { uri: result.assets[0].uri, name: result.assets[0].name ?? 'import' }
}

export async function readExcelFile(uri: string): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
  const wb = XLSX.read(base64, { type: 'base64' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  const headers = raw.length > 0 ? Object.keys(raw[0]) : []
  return { headers, rows: raw }
}

export async function importMilkData(
  rows: Record<string, string>[],
  columnMap: { cow: string; date: string; litres: string },
  db: import('expo-sqlite').SQLiteDatabase,
): Promise<ImportResult> {
  const result: ImportResult = { success: false, imported: 0, skipped: 0, errors: [] }

  for (const [i, row] of rows.entries()) {
    const cowName = row[columnMap.cow]?.trim()
    const date = normalizeDate(row[columnMap.date])
    const litres = parseFloat(row[columnMap.litres])

    if (!cowName || !date || isNaN(litres)) {
      result.skipped++
      continue
    }

    const cow = await db.getFirstAsync<{ local_id: string }>(
      `SELECT local_id FROM cows WHERE LOWER(name) = LOWER(?) AND deleted = 0 LIMIT 1`,
      [cowName]
    )
    if (!cow) {
      result.errors.push(`Row ${i + 2}: cow "${cowName}" not found`)
      result.skipped++
      continue
    }

    await db.runAsync(
      `INSERT OR IGNORE INTO milk_log (local_id, cow_local_id, date, session, quantity_litres, dirty)
       VALUES (?, ?, ?, 'total', ?, 1)`,
      [generateId(), cow.local_id, date, litres]
    )
    result.imported++
  }

  result.success = result.errors.length === 0 || result.imported > 0
  return result
}

export async function importHerdData(
  rows: Record<string, string>[],
  columnMap: { name: string; breed?: string; dob?: string; earTag?: string; status?: string },
  db: import('expo-sqlite').SQLiteDatabase,
): Promise<ImportResult> {
  const result: ImportResult = { success: false, imported: 0, skipped: 0, errors: [] }

  for (const [i, row] of rows.entries()) {
    const name = row[columnMap.name]?.trim()
    if (!name) { result.skipped++; continue }

    const existing = await db.getFirstAsync<{ local_id: string }>(
      `SELECT local_id FROM cows WHERE LOWER(name) = LOWER(?) AND deleted = 0 LIMIT 1`,
      [name]
    )
    if (existing) {
      result.skipped++
      result.errors.push(`Row ${i + 2}: "${name}" already exists (skipped)`)
      continue
    }

    const dob = columnMap.dob ? normalizeDate(row[columnMap.dob]) : null
    const breed = columnMap.breed ? (row[columnMap.breed]?.trim() || 'Unknown') : 'Unknown'
    const earTag = columnMap.earTag ? row[columnMap.earTag]?.trim() : null
    const status = columnMap.status ? (row[columnMap.status]?.trim().toLowerCase() || 'active') : 'active'

    await db.runAsync(
      `INSERT INTO cows (local_id, name, breed, date_of_birth, ear_tag, status, dirty)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [generateId(), name, breed, dob, earTag, status]
    )
    result.imported++
  }

  result.success = result.errors.length === 0 || result.imported > 0
  return result
}

// Normalise various date formats to YYYY-MM-DD
function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`

  // Excel serial date (number)
  const serial = parseFloat(s)
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
    return date.toISOString().slice(0, 10)
  }

  return null
}
