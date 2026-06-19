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
const EVENT_TYPES = ['Vaccination', 'Treatment', 'Deworming', 'Dipping', 'Vet visit', 'Injury', 'Other']

export default function LogHealthScreen() {
  const { cowId } = useLocalSearchParams<{ cowId?: string }>()
  const db = useSQLiteContext()
  const router = useRouter()
  const [cows, setCows] = useState<Cow[]>([])
  const [selectedCow, setSelectedCow] = useState(cowId ?? '')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [eventType, setEventType] = useState('Vaccination')
  const [description, setDescription] = useState('')
  const [drugUsed, setDrugUsed] = useState('')
  const [dosage, setDosage] = useState('')
  const [vetName, setVetName] = useState('')
  const [cost, setCost] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.getAllAsync<Cow>(`SELECT local_id, name FROM cows WHERE deleted = 0 ORDER BY name`).then(setCows)
  }, [db])

  async function handleSave() {
    if (!selectedCow) return Alert.alert('Select a cow')
    if (!description.trim()) return Alert.alert('Enter a description')

    setSaving(true)
    await db.runAsync(
      `INSERT INTO health_log
       (local_id, cow_local_id, date, event_type, description, drug_used, dosage, vet_name, cost, next_due_date, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        generateId(), selectedCow, date, eventType,
        description.trim(),
        drugUsed.trim() || null,
        dosage.trim() || null,
        vetName.trim() || null,
        parseFloat(cost) || 0,
        nextDue.trim() || null,
      ]
    )
    setSaving(false)
    router.back()
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center px-4 pt-12 pb-4" style={{ backgroundColor: '#C0392B' }}>
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-bold">Log Health Event</Text>
          <Text className="text-white/70 text-xs">Treatment, vaccination, vet visit</Text>
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
                  className={`px-4 py-2 rounded-full border ${selectedCow === c.local_id ? 'border-moka-danger' : 'border-gray-200'}`}
                  style={selectedCow === c.local_id ? { backgroundColor: '#C0392B' } : {}}
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
          <Text className="text-moka-mid text-sm mb-2">Event type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {EVENT_TYPES.map((e) => (
                <TouchableOpacity
                  key={e}
                  className={`px-3 py-2 rounded-full border ${eventType === e ? 'border-moka-danger' : 'border-gray-200'}`}
                  style={eventType === e ? { backgroundColor: '#C0392B' } : {}}
                  onPress={() => setEventType(e)}
                >
                  <Text className={`text-sm font-semibold ${eventType === e ? 'text-white' : 'text-moka-mid'}`}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Description *</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="What happened / what was done..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Drug used</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. Ivomec"
              value={drugUsed}
              onChangeText={setDrugUsed}
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Dosage</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 5ml"
              value={dosage}
              onChangeText={setDosage}
            />
          </View>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Vet name</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="Dr. Kamau..."
            value={vetName}
            onChangeText={setVetName}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Cost (KES)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="0"
              keyboardType="decimal-pad"
              value={cost}
              onChangeText={setCost}
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Next due date</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="YYYY-MM-DD"
              value={nextDue}
              onChangeText={setNextDue}
            />
          </View>
        </View>

        <TouchableOpacity
          className="rounded-xl py-4 items-center mt-2"
          style={{ backgroundColor: '#C0392B' }}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Health Record</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
