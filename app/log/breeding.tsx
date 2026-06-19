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

// Matches physical breeding board sequence
const EVENT_TYPES = [
  { key: 'heat_observed', label: 'Heat Observed' },
  { key: 'ai_insemination', label: 'AI Insemination' },
  { key: 'natural_mating', label: 'Natural Mating' },
  { key: 'pregnancy_confirmed', label: 'PD - Confirmed' },
  { key: 'pregnancy_failed', label: 'PD - Negative' },
  { key: 'calved', label: 'Calved' },
]

export default function LogBreedingScreen() {
  const { cowId } = useLocalSearchParams<{ cowId?: string }>()
  const db = useSQLiteContext()
  const router = useRouter()
  const [cows, setCows] = useState<Cow[]>([])
  const [selectedCow, setSelectedCow] = useState(cowId ?? '')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [eventType, setEventType] = useState('ai_insemination')
  const [sireCode, setSireCode] = useState('')
  const [bullDetails, setBullDetails] = useState('')
  const [expectedCalving, setExpectedCalving] = useState('')
  const [actualCalving, setActualCalving] = useState('')
  const [pdDate, setPdDate] = useState('')
  const [pdResult, setPdResult] = useState('')
  const [dryDate, setDryDate] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.getAllAsync<Cow>(`SELECT local_id, name FROM cows WHERE deleted = 0 ORDER BY name`).then(setCows)
  }, [db])

  // Auto-calculate expected calving when date or event type changes
  useEffect(() => {
    if (eventType === 'ai_insemination' || eventType === 'natural_mating') {
      if (date) {
        setExpectedCalving(dayjs(date).add(283, 'day').format('YYYY-MM-DD'))
      }
    }
  }, [date, eventType])

  async function handleSave() {
    if (!selectedCow) return Alert.alert('Select a cow')
    setSaving(true)
    await db.runAsync(
      `INSERT INTO breeding_log
       (local_id, cow_local_id, date, event_type, sire_code, bull_or_stud_details,
        expected_calving_date, actual_calving_date, pd_date, pd_result, dry_date,
        cost, notes, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        generateId(), selectedCow, date, eventType,
        sireCode.trim() || null,
        bullDetails.trim() || null,
        expectedCalving.trim() || null,
        actualCalving.trim() || null,
        pdDate.trim() || null,
        pdResult || null,
        dryDate.trim() || null,
        parseFloat(cost) || 0,
        notes.trim() || null,
      ]
    )
    setSaving(false)
    router.back()
  }

  const showServiceFields = eventType === 'ai_insemination' || eventType === 'natural_mating'
  const showPdFields = eventType === 'pregnancy_confirmed' || eventType === 'pregnancy_failed'
  const showCalvingFields = eventType === 'calved'

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center px-4 pt-12 pb-4" style={{ backgroundColor: '#9B59B6' }}>
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-bold">Log Breeding</Text>
          <Text className="text-white/70 text-xs">AI, PD, calving events</Text>
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
                  className={`px-4 py-2 rounded-full border ${selectedCow === c.local_id ? 'border-purple-600' : 'border-gray-200'}`}
                  style={selectedCow === c.local_id ? { backgroundColor: '#9B59B6' } : {}}
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
          <View className="gap-2">
            {EVENT_TYPES.map((e) => (
              <TouchableOpacity
                key={e.key}
                className={`px-4 py-3 rounded-xl border ${eventType === e.key ? 'border-purple-600' : 'border-gray-200'}`}
                style={eventType === e.key ? { backgroundColor: '#9B59B6' } : {}}
                onPress={() => setEventType(e.key)}
              >
                <Text className={`text-sm font-semibold ${eventType === e.key ? 'text-white' : 'text-moka-mid'}`}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showServiceFields && (
          <>
            <View>
              <Text className="text-moka-mid text-sm mb-1">Sire code (AI bull code)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                placeholder="e.g. 4110H885"
                value={sireCode}
                onChangeText={setSireCode}
              />
            </View>

            <View>
              <Text className="text-moka-mid text-sm mb-1">Bull / stud details</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                placeholder="Bull name, breed, AI technician..."
                value={bullDetails}
                onChangeText={setBullDetails}
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-moka-mid text-sm mb-1">Next heat (est.)</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  value={dayjs(date || dayjs()).add(21, 'day').format('YYYY-MM-DD')}
                  editable={false}
                  style={{ backgroundColor: '#F9F9F9' }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-moka-mid text-sm mb-1">Expected calving</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="YYYY-MM-DD"
                  value={expectedCalving}
                  onChangeText={setExpectedCalving}
                />
              </View>
            </View>
          </>
        )}

        {showPdFields && (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-moka-mid text-sm mb-1">PD date *</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="YYYY-MM-DD"
                  value={pdDate}
                  onChangeText={setPdDate}
                />
              </View>
              <View className="flex-1">
                <Text className="text-moka-mid text-sm mb-2">PD result</Text>
                <View className="flex-row gap-2">
                  {['positive', 'negative'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      className={`flex-1 py-3 rounded-xl border items-center ${pdResult === r ? 'border-purple-600' : 'border-gray-200'}`}
                      style={pdResult === r ? { backgroundColor: '#9B59B6' } : {}}
                      onPress={() => setPdResult(r)}
                    >
                      <Text className={`text-xs font-semibold capitalize ${pdResult === r ? 'text-white' : 'text-moka-mid'}`}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            {pdResult === 'positive' && (
              <View>
                <Text className="text-moka-mid text-sm mb-1">Dry date (expected)</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                  placeholder="YYYY-MM-DD"
                  value={dryDate}
                  onChangeText={setDryDate}
                />
              </View>
            )}
          </>
        )}

        {showCalvingFields && (
          <View>
            <Text className="text-moka-mid text-sm mb-1">Actual calving date *</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="YYYY-MM-DD"
              value={actualCalving}
              onChangeText={setActualCalving}
            />
          </View>
        )}

        <View>
          <Text className="text-moka-mid text-sm mb-1">Cost (KES)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="AI straw, vet fee..."
            keyboardType="decimal-pad"
            value={cost}
            onChangeText={setCost}
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Notes</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="Additional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </View>

        <TouchableOpacity
          className="rounded-xl py-4 items-center mt-2"
          style={{ backgroundColor: '#9B59B6' }}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Record</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
