import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
  RefreshControl,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { generateId } from '@/lib/database'
import { useAuthStore } from '@/store/auth'
import EmptyState from '@/components/EmptyState'

interface Sale {
  local_id: string
  date: string
  buyer_name: string | null
  quantity_litres: number
  price_per_litre: number
  payment_method: string
  mpesa_reference: string | null
}

export default function SalesScreen() {
  const db = useSQLiteContext()
  const { profile } = useAuthStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [monthTotal, setMonthTotal] = useState(0)
  const [monthLitres, setMonthLitres] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Form state
  const [sDate, setSDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [sBuyer, setSBuyer] = useState('')
  const [sLitres, setSLitres] = useState('')
  const [sPrice, setSPrice] = useState(String(profile?.default_milk_price ?? 60))
  const [sMethod, setSMethod] = useState('cash')
  const [sMpesa, setSMpesa] = useState('')

  const load = useCallback(async () => {
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
    const [rows, stats] = await Promise.all([
      db.getAllAsync<Sale>(
        `SELECT * FROM milk_sales WHERE deleted = 0 ORDER BY date DESC LIMIT 50`
      ),
      db.getFirstAsync<{ total: number; litres: number }>(
        `SELECT COALESCE(SUM(quantity_litres * price_per_litre), 0) as total,
                COALESCE(SUM(quantity_litres), 0) as litres
         FROM milk_sales WHERE date >= ? AND deleted = 0`,
        [monthStart]
      ),
    ])
    setSales(rows)
    setMonthTotal(stats?.total ?? 0)
    setMonthLitres(stats?.litres ?? 0)
  }, [db])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  async function saveSale() {
    if (!sLitres.trim() || !sPrice.trim()) return Alert.alert('Fill litres and price')
    const litres = parseFloat(sLitres)
    const price = parseFloat(sPrice)
    if (isNaN(litres) || litres <= 0) return Alert.alert('Invalid litres')
    if (isNaN(price) || price <= 0) return Alert.alert('Invalid price')

    setSaving(true)
    const id = generateId()
    await db.runAsync(
      `INSERT INTO milk_sales (local_id, date, buyer_name, quantity_litres, price_per_litre, payment_method, mpesa_reference, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, sDate, sBuyer || null, litres, price, sMethod, sMpesa || null]
    )
    setSaving(false)
    setShowModal(false)
    setSLitres('')
    setSBuyer('')
    setSMpesa('')
    await load()
  }

  function renderSale({ item }: { item: Sale }) {
    const total = item.quantity_litres * item.price_per_litre
    return (
      <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-moka-light items-center justify-center mr-3">
          <Ionicons name="cash-outline" size={20} color="#2D5016" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-moka-dark font-bold text-sm">{item.quantity_litres}L</Text>
            {item.buyer_name ? <Text className="text-moka-text text-xs">to {item.buyer_name}</Text> : null}
          </View>
          <Text className="text-moka-text text-xs mt-0.5">
            KES {item.price_per_litre}/L - {item.payment_method}
            {item.mpesa_reference ? ` (${item.mpesa_reference})` : ''}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-moka-green font-bold text-sm">KES {total.toLocaleString()}</Text>
          <Text className="text-moka-text text-xs mt-0.5">{dayjs(item.date).format('D MMM')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Month summary */}
      <View className="bg-moka-green mx-4 mt-4 mb-2 rounded-2xl p-4">
        <Text className="text-moka-text text-xs">{dayjs().format('MMMM YYYY')} sales</Text>
        <Text className="text-white text-2xl font-bold mt-1">KES {monthTotal.toLocaleString()}</Text>
        <Text className="text-moka-text text-xs mt-1">{monthLitres.toFixed(1)} litres sold</Text>
      </View>

      <TouchableOpacity
        className="mx-4 mb-3 bg-white rounded-2xl py-3 flex-row items-center justify-center gap-2 border border-moka-green shadow-sm"
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={18} color="#2D5016" />
        <Text className="text-moka-green font-semibold text-sm">Record Sale</Text>
      </TouchableOpacity>

      <FlatList
        data={sales}
        keyExtractor={(s) => s.local_id}
        renderItem={renderSale}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
        ListEmptyComponent={
          <EmptyState icon="cash-outline" message="No sales recorded" sub="Tap 'Record Sale' to log your first milk sale" />
        }
      />

      {/* Add sale modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-gray-100">
              <Text className="text-moka-dark text-xl font-bold">Record Sale</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#4A5540" />
              </TouchableOpacity>
            </View>

            <View className="px-5 pt-4 gap-4">
              <View>
                <Text className="text-moka-mid text-sm mb-1">Date</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  value={sDate}
                  onChangeText={setSDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Litres sold</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="e.g. 10.5"
                  keyboardType="decimal-pad"
                  value={sLitres}
                  onChangeText={setSLitres}
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Price per litre (KES)</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="60"
                  keyboardType="decimal-pad"
                  value={sPrice}
                  onChangeText={setSPrice}
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Buyer name (optional)</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="KCC, local customer..."
                  value={sBuyer}
                  onChangeText={setSBuyer}
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-2">Payment method</Text>
                <View className="flex-row gap-2">
                  {['cash', 'mpesa', 'bank'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      className={`px-4 py-2 rounded-full border ${sMethod === m ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                      onPress={() => setSMethod(m)}
                    >
                      <Text className={`text-sm font-semibold capitalize ${sMethod === m ? 'text-white' : 'text-moka-mid'}`}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {sMethod === 'mpesa' && (
                <View>
                  <Text className="text-moka-mid text-sm mb-1">M-Pesa reference</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                    placeholder="QK7X2Y..."
                    value={sMpesa}
                    onChangeText={setSMpesa}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {sLitres && sPrice ? (
                <View className="bg-moka-light rounded-xl px-4 py-3">
                  <Text className="text-moka-mid text-sm">Total</Text>
                  <Text className="text-moka-green text-xl font-bold">
                    KES {(parseFloat(sLitres || '0') * parseFloat(sPrice || '0')).toLocaleString()}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                className="bg-moka-green rounded-xl py-4 items-center mt-2 mb-6"
                onPress={saveSale}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Sale</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
