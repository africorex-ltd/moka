import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSQLiteContext } from 'expo-sqlite'
import dayjs from 'dayjs'
import { generateId } from '@/lib/database'

interface Cow { local_id: string; name: string }
const FEED_TYPES = ['Napier grass', 'Dairy meal', 'Silage', 'Hay', 'Maize germ', 'Cotton seed cake', 'Other']

export default function LogFeedingScreen() {
  const { cowId } = useLocalSearchParams<{ cowId?: string }>()
  const db = useSQLiteContext()
  const router = useRouter()
  const [cows, setCows] = useState<Cow[]>([])
  const [selectedCow, setSelectedCow] = useState(cowId ?? '')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [feedType, setFeedType] = useState('Napier grass')
  const [kgs, setKgs] = useState('')
  const [costPerKg, setCostPerKg] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.getAllAsync<Cow>(`SELECT local_id, name FROM cows WHERE status = 'active' AND deleted = 0 ORDER BY name`).then(setCows)
  }, [db])

  async function handleSave() {
    if (!selectedCow) return Alert.alert('Select a cow')
    if (!kgs.trim()) return Alert.alert('Enter quantity in kg')
    const qty = parseFloat(kgs)
    if (isNaN(qty) || qty <= 0) return Alert.alert('Invalid quantity')

    setSaving(true)
    await db.runAsync(
      `INSERT INTO feeding_log (local_id, cow_local_id, date, feed_type, quantity_kg, cost_per_kg, notes, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [generateId(), selectedCow, date, feedType, qty, parseFloat(costPerKg) || 0, notes.trim() || null]
    )
    setSaving(false)
    router.back()
  }

  const total = (parseFloat(kgs) || 0) * (parseFloat(costPerKg) || 0)

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-gold">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-bold">Log Feeding</Text>
          <Text className="text-white/70 text-xs">Track feed given to a cow</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text className="text-moka-mid text-sm mb-2">Cow *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {cows.map((c) => (
                <TouchableOpacity
                  key={c.local_id}
                  className={`px-4 py-2 rounded-full border ${selectedCow === c.local_id ? 'bg-moka-gold border-moka-gold' : 'border-gray-200'}`}
                  onPress={() => setSelectedCow(c.local_id)}
                >
                  <Text className={`text-sm font-semibold ${selectedCow === c.local_id ? 'text-white' : 'text-moka-mid'}`}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Date *</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-2">Feed type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {FEED_TYPES.map((f) => (
                <TouchableOpacity
                  key={f}
                  className={`px-3 py-2 rounded-full border ${feedType === f ? 'bg-moka-gold border-moka-gold' : 'border-gray-200'}`}
                  onPress={() => setFeedType(f)}
                >
                  <Text className={`text-sm font-semibold ${feedType === f ? 'text-white' : 'text-moka-mid'}`}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Quantity (kg) *</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 20"
              keyboardType="decimal-pad"
              value={kgs}
              onChangeText={setKgs}
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Cost per kg (KES)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 25"
              keyboardType="decimal-pad"
              value={costPerKg}
              onChangeText={setCostPerKg}
            />
          </View>
        </View>

        {total > 0 && (
          <View className="bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-100">
            <Text className="text-moka-mid text-sm">Feed cost</Text>
            <Text className="text-moka-gold font-bold text-lg">KES {total.toLocaleString()}</Text>
          </View>
        )}

        <View>
          <Text className="text-moka-mid text-sm mb-1">Notes</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="Optional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </View>

        <TouchableOpacity
          className="rounded-xl py-4 items-center mt-2"
          style={{ backgroundColor: '#B8860B' }}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Record</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
