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

interface Cost {
  local_id: string
  date: string
  category: string
  description: string
  amount: number
}

const CATEGORIES = ['Rent', 'Salaries', 'Transport', 'Marketing', 'Packaging', 'Utilities', 'Maintenance', 'Other']

export default function BusinessCostsScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [costs, setCosts] = useState<Cost[]>([])
  const [monthTotal, setMonthTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [cDate, setCDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [cCategory, setCCategory] = useState('Rent')
  const [cDesc, setCDesc] = useState('')
  const [cAmount, setCAmount] = useState('')

  const load = useCallback(async () => {
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
    const [rows, tot] = await Promise.all([
      db.getAllAsync<Cost>(
        `SELECT * FROM business_costs WHERE deleted = 0 ORDER BY date DESC LIMIT 50`
      ),
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM business_costs WHERE date >= ? AND deleted = 0`,
        [monthStart]
      ),
    ])
    setCosts(rows)
    setMonthTotal(tot?.total ?? 0)
  }, [db])

  useEffect(() => { load() }, [load])

  async function saveCost() {
    if (!cDesc.trim()) return Alert.alert('Enter a description')
    const amount = parseFloat(cAmount)
    if (isNaN(amount) || amount <= 0) return Alert.alert('Enter a valid amount')

    setSaving(true)
    await db.runAsync(
      `INSERT INTO business_costs (local_id, date, category, description, amount, dirty) VALUES (?, ?, ?, ?, ?, 1)`,
      [generateId(), cDate, cCategory, cDesc.trim(), amount]
    )
    setSaving(false)
    setShowModal(false)
    setCDesc('')
    setCAmount('')
    await load()
  }

  function renderCost({ item }: { item: Cost }) {
    return (
      <View className="bg-white mx-4 mb-3 rounded-2xl px-4 py-3 shadow-sm flex-row items-center">
        <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#B8860B20' }}>
          <Ionicons name="receipt-outline" size={18} color="#B8860B" />
        </View>
        <View className="flex-1">
          <Text className="text-moka-dark text-sm font-semibold">{item.description}</Text>
          <View className="flex-row gap-2 mt-0.5">
            <Text className="text-moka-text text-xs">{item.category}</Text>
            <Text className="text-moka-text text-xs">{dayjs(item.date).format('D MMM')}</Text>
          </View>
        </View>
        <Text className="text-moka-gold font-bold text-sm">KES {item.amount.toLocaleString()}</Text>
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
          <Text className="text-white text-xl font-bold">Business Costs</Text>
        </View>
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View className="mx-4 mt-4 mb-3 bg-moka-gold rounded-2xl p-4">
        <Text className="text-white/70 text-xs">Business costs this month</Text>
        <Text className="text-white text-2xl font-bold mt-1">KES {monthTotal.toLocaleString()}</Text>
      </View>

      <FlatList
        data={costs}
        keyExtractor={(c) => c.local_id}
        renderItem={renderCost}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState icon="receipt-outline" message="No business costs" sub="Track rent, salaries, transport and more" />}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-gray-100">
              <Text className="text-moka-dark text-xl font-bold">Add Cost</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#4A5540" />
              </TouchableOpacity>
            </View>
            <View className="px-5 pt-4 gap-4">
              <View>
                <Text className="text-moka-mid text-sm mb-1">Date</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" value={cDate} onChangeText={setCDate} placeholder="YYYY-MM-DD" />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-2">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {CATEGORIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        className={`px-3 py-2 rounded-full border ${cCategory === c ? 'bg-moka-gold border-moka-gold' : 'border-gray-200'}`}
                        onPress={() => setCCategory(c)}
                      >
                        <Text className={`text-sm ${cCategory === c ? 'text-white' : 'text-moka-mid'}`}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Description *</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="e.g. Shop rent for June..."
                  value={cDesc}
                  onChangeText={setCDesc}
                  autoFocus
                />
              </View>
              <View>
                <Text className="text-moka-mid text-sm mb-1">Amount (KES) *</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="e.g. 5000"
                  keyboardType="decimal-pad"
                  value={cAmount}
                  onChangeText={setCAmount}
                />
              </View>
              <TouchableOpacity
                className="rounded-xl py-4 items-center mb-6"
                style={{ backgroundColor: '#B8860B' }}
                onPress={saveCost}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Save Cost</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
