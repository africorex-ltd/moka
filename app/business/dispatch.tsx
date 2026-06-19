import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { generateId } from '@/lib/database'
import EmptyState from '@/components/EmptyState'

interface Dispatch {
  local_id: string
  date: string
  quantity_litres: number
  transport_type: string
  transport_cost: number
  carrier_name: string | null
  notes: string | null
  point_name: string | null
}

interface SalesPoint { local_id: string; name: string }

const TRANSPORT = ['bodaboda', 'matatu', 'own vehicle', 'on foot', 'other']

export default function DispatchScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [dDate, setDDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [dLitres, setDLitres] = useState('')
  const [dPoint, setDPoint] = useState('')
  const [dBy, setDBy] = useState('')
  const [dReceived, setDReceived] = useState('')
  const [dTransport, setDTransport] = useState('bodaboda')
  const [dTransportCost, setDTransportCost] = useState('')
  const [dCarrier, setDCarrier] = useState('')
  const [dNotes, setDNotes] = useState('')

  const load = useCallback(async () => {
    const [rows, pts] = await Promise.all([
      db.getAllAsync<Dispatch>(`
        SELECT d.*, sp.name as point_name
        FROM milk_dispatch d
        LEFT JOIN sales_points sp ON d.sales_point_local_id = sp.local_id
        WHERE d.deleted = 0 ORDER BY d.date DESC LIMIT 30
      `),
      db.getAllAsync<SalesPoint>(
        `SELECT local_id, name FROM sales_points WHERE deleted = 0 AND is_active = 1`
      ),
    ])
    setDispatches(rows)
    setSalesPoints(pts)
  }, [db])

  useEffect(() => { load() }, [load])

  async function saveDispatch() {
    if (!dLitres.trim()) return Alert.alert('Enter litres')
    const litres = parseFloat(dLitres)
    if (isNaN(litres) || litres <= 0) return Alert.alert('Invalid litres')

    setSaving(true)
    await db.runAsync(
      `INSERT INTO milk_dispatch
       (local_id, date, quantity_litres, sales_point_local_id, dispatched_by, received_by,
        transport_type, transport_cost, carrier_name, notes, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        generateId(), dDate, litres,
        dPoint || null, dBy.trim() || null, dReceived.trim() || null,
        dTransport, parseFloat(dTransportCost) || 0,
        dCarrier.trim() || null, dNotes.trim() || null,
      ]
    )
    setSaving(false)
    setShowModal(false)
    setDLitres('')
    setDBy('')
    setDReceived('')
    setDTransportCost('')
    setDCarrier('')
    setDNotes('')
    await load()
  }

  function renderDispatch({ item }: { item: Dispatch }) {
    return (
      <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm">
        <View className="flex-row justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Ionicons name="cube-outline" size={18} color="#2D5016" />
              <Text className="text-moka-dark font-bold text-base">{item.quantity_litres}L dispatched</Text>
            </View>
            {item.point_name ? (
              <Text className="text-moka-text text-xs mt-1 ml-6">To: {item.point_name}</Text>
            ) : null}
            <View className="flex-row mt-2 ml-6 gap-2">
              <View className="bg-moka-light px-2 py-0.5 rounded-full">
                <Text className="text-moka-green text-xs capitalize">{item.transport_type}</Text>
              </View>
              {item.transport_cost > 0 && (
                <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                  <Text className="text-moka-mid text-xs">KES {item.transport_cost}</Text>
                </View>
              )}
            </View>
          </View>
          <Text className="text-moka-text text-xs">{dayjs(item.date).format('D MMM')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4 bg-moka-green">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Milk Dispatch</Text>
        </View>
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dispatches}
        keyExtractor={(d) => d.local_id}
        renderItem={renderDispatch}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={
          <EmptyState icon="cube-outline" message="No dispatches recorded" sub="Log milk sent to sales points" />
        }
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-gray-100">
              <Text className="text-moka-dark text-xl font-bold">Log Dispatch</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#4A5540" />
              </TouchableOpacity>
            </View>
            <View className="px-5 pt-4 gap-4">
              <View>
                <Text className="text-moka-mid text-sm mb-1">Date</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  value={dDate}
                  onChangeText={setDDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Litres dispatched *</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="e.g. 20"
                  keyboardType="decimal-pad"
                  value={dLitres}
                  onChangeText={setDLitres}
                />
              </View>
              {salesPoints.length > 0 && (
                <View>
                  <Text className="text-moka-mid text-sm mb-2">Sales point</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {salesPoints.map((p) => (
                        <TouchableOpacity
                          key={p.local_id}
                          className={`px-3 py-2 rounded-full border ${dPoint === p.local_id ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                          onPress={() => setDPoint(p.local_id)}
                        >
                          <Text className={`text-sm ${dPoint === p.local_id ? 'text-white' : 'text-moka-mid'}`}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
              <View>
                <Text className="text-moka-mid text-sm mb-2">Transport</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {TRANSPORT.map((t) => (
                      <TouchableOpacity
                        key={t}
                        className={`px-3 py-2 rounded-full border capitalize ${dTransport === t ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                        onPress={() => setDTransport(t)}
                      >
                        <Text className={`text-sm capitalize ${dTransport === t ? 'text-white' : 'text-moka-mid'}`}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-1">Transport cost (KES)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={dTransportCost}
                    onChangeText={setDTransportCost}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-1">Carrier</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                    placeholder="Name..."
                    value={dCarrier}
                    onChangeText={setDCarrier}
                  />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-1">Dispatched by</Text>
                  <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" value={dBy} onChangeText={setDBy} />
                </View>
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-1">Received by</Text>
                  <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" value={dReceived} onChangeText={setDReceived} />
                </View>
              </View>
              <TouchableOpacity
                className="bg-moka-green rounded-xl py-4 items-center mb-6"
                onPress={saveDispatch}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Save Dispatch</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
