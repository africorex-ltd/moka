import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { generateId } from '@/lib/database'
import EmptyState from '@/components/EmptyState'

interface SalesPoint {
  local_id: string
  name: string
  location: string | null
  type: string
  rent_amount: number
  rent_period: string
  is_active: number
}

const POINT_TYPES = ['kiosk', 'shop', 'market stall', 'home delivery', 'cooperative', 'other']

export default function SalesPointScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [points, setPoints] = useState<SalesPoint[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [pName, setPName] = useState('')
  const [pLocation, setPLocation] = useState('')
  const [pType, setPType] = useState('kiosk')
  const [pRent, setPRent] = useState('')
  const [pRentPeriod, setPRentPeriod] = useState('monthly')

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<SalesPoint>(
      `SELECT * FROM sales_points WHERE deleted = 0 ORDER BY name`
    )
    setPoints(rows)
  }, [db])

  useEffect(() => { load() }, [load])

  async function savePoint() {
    if (!pName.trim()) return Alert.alert('Enter a name')
    setSaving(true)
    await db.runAsync(
      `INSERT INTO sales_points (local_id, name, location, type, rent_amount, rent_period, dirty)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [generateId(), pName.trim(), pLocation.trim() || null, pType, parseFloat(pRent) || 0, pRentPeriod]
    )
    setSaving(false)
    setShowModal(false)
    setPName('')
    setPLocation('')
    setPRent('')
    await load()
  }

  async function toggleActive(point: SalesPoint) {
    await db.runAsync(
      `UPDATE sales_points SET is_active = ?, dirty = 1 WHERE local_id = ?`,
      [point.is_active ? 0 : 1, point.local_id]
    )
    await load()
  }

  function renderPoint({ item }: { item: SalesPoint }) {
    return (
      <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Ionicons name="storefront-outline" size={18} color="#2D5016" />
              <Text className="text-moka-dark font-bold text-base">{item.name}</Text>
            </View>
            {item.location ? <Text className="text-moka-text text-sm mt-1 ml-6">{item.location}</Text> : null}
            <View className="flex-row mt-2 ml-6 gap-2 flex-wrap">
              <View className="bg-moka-light px-2 py-0.5 rounded-full">
                <Text className="text-moka-green text-xs capitalize">{item.type}</Text>
              </View>
              {item.rent_amount > 0 && (
                <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                  <Text className="text-moka-mid text-xs">KES {item.rent_amount.toLocaleString()}/{item.rent_period}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            className={`px-3 py-1.5 rounded-full ${item.is_active ? 'bg-moka-light' : 'bg-gray-100'}`}
            onPress={() => toggleActive(item)}
          >
            <Text className={`text-xs font-semibold ${item.is_active ? 'text-moka-green' : 'text-moka-text'}`}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
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
          <Text className="text-white text-xl font-bold">Sales Points</Text>
        </View>
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={points}
        keyExtractor={(p) => p.local_id}
        renderItem={renderPoint}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={
          <EmptyState icon="storefront-outline" message="No sales points" sub="Add a kiosk, shop or market stall" />
        }
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-gray-100">
              <Text className="text-moka-dark text-xl font-bold">Add Sales Point</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#4A5540" />
              </TouchableOpacity>
            </View>
            <View className="px-5 pt-4 gap-4">
              <View>
                <Text className="text-moka-mid text-sm mb-1">Name *</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="Kiambu Town Kiosk"
                  value={pName}
                  onChangeText={setPName}
                  autoFocus
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Location</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="Street, area..."
                  value={pLocation}
                  onChangeText={setPLocation}
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-2">Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {POINT_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        className={`px-3 py-2 rounded-full border capitalize ${pType === t ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                        onPress={() => setPType(t)}
                      >
                        <Text className={`text-sm font-semibold capitalize ${pType === t ? 'text-white' : 'text-moka-mid'}`}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-1">Rent (KES)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={pRent}
                    onChangeText={setPRent}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-moka-mid text-sm mb-2">Period</Text>
                  <View className="gap-1">
                    {['monthly', 'weekly', 'daily'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        className={`px-3 py-1.5 rounded-lg border ${pRentPeriod === p ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                        onPress={() => setPRentPeriod(p)}
                      >
                        <Text className={`text-sm capitalize text-center ${pRentPeriod === p ? 'text-white' : 'text-moka-mid'}`}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                className="bg-moka-green rounded-xl py-4 items-center mb-6"
                onPress={savePoint}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Save Sales Point</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
