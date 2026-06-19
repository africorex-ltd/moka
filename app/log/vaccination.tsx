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

const VACCINES = ['FMD', 'BRD Complex', 'Anthrax', 'Blackleg', 'Brucellosis', 'LSD (Lumpy Skin)', 'ECF', 'Other']

export default function LogVaccinationScreen() {
  const { cowId } = useLocalSearchParams<{ cowId?: string }>()
  const db = useSQLiteContext()
  const router = useRouter()
  const [cows, setCows] = useState<Cow[]>([])
  const [selectedCow, setSelectedCow] = useState(cowId ?? '')
  const [allCows, setAllCows] = useState(false)
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [vaccine, setVaccine] = useState('')
  const [customVaccine, setCustomVaccine] = useState('')
  const [dosage, setDosage] = useState('')
  const [vetName, setVetName] = useState('')
  const [cost, setCost] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.getAllAsync<Cow>(`SELECT local_id, name FROM cows WHERE deleted = 0 ORDER BY name`).then(setCows)
  }, [db])

  async function handleSave() {
    const vaccineName = vaccine === 'Other' ? customVaccine.trim() : vaccine
    if (!vaccineName) return Alert.alert('Select or enter vaccine name')
    const targets = allCows ? cows : cows.filter((c) => c.local_id === selectedCow)
    if (targets.length === 0) return Alert.alert('Select at least one cow')

    setSaving(true)
    for (const cow of targets) {
      await db.runAsync(
        `INSERT INTO health_log
         (local_id, cow_local_id, date, event_type, description, drug_used, dosage, vet_name, cost, next_due_date, dirty)
         VALUES (?, ?, ?, 'vaccine', ?, ?, ?, ?, ?, ?, 1)`,
        [
          generateId(), cow.local_id, date,
          vaccineName,
          vaccineName,
          dosage.trim() || null,
          vetName.trim() || null,
          parseFloat(cost) || 0,
          nextDue.trim() || null,
        ]
      )
    }
    setSaving(false)
    router.back()
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center px-4 pt-12 pb-4" style={{ backgroundColor: '#1ABC9C' }}>
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-bold">Log Vaccination</Text>
          <Text className="text-white/70 text-xs">Vaccine administered today</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">

        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-moka-mid text-sm">Cow(s) *</Text>
            <TouchableOpacity
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${allCows ? 'bg-teal-500' : 'bg-gray-100'}`}
              onPress={() => setAllCows(!allCows)}
            >
              <Ionicons name={allCows ? 'checkbox' : 'square-outline'} size={14} color={allCows ? 'white' : '#8A9E80'} />
              <Text className={`text-xs font-semibold ${allCows ? 'text-white' : 'text-moka-mid'}`}>Whole herd</Text>
            </TouchableOpacity>
          </View>
          {!allCows && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {cows.map((c) => (
                  <TouchableOpacity
                    key={c.local_id}
                    className={`px-4 py-2 rounded-full border ${selectedCow === c.local_id ? 'border-teal-500' : 'border-gray-200'}`}
                    style={selectedCow === c.local_id ? { backgroundColor: '#1ABC9C' } : {}}
                    onPress={() => setSelectedCow(c.local_id)}
                  >
                    <Text className={`text-sm font-semibold ${selectedCow === c.local_id ? 'text-white' : 'text-moka-mid'}`}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
          {allCows && (
            <View className="bg-teal-50 rounded-xl px-4 py-2">
              <Text className="text-teal-700 text-sm">Applying to all {cows.length} cows</Text>
            </View>
          )}
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
          <Text className="text-moka-mid text-sm mb-2">Vaccine *</Text>
          <View className="flex-row flex-wrap gap-2">
            {VACCINES.map((v) => (
              <TouchableOpacity
                key={v}
                className={`px-3 py-2 rounded-full border ${vaccine === v ? 'border-teal-500' : 'border-gray-200'}`}
                style={vaccine === v ? { backgroundColor: '#1ABC9C' } : {}}
                onPress={() => setVaccine(v)}
              >
                <Text className={`text-sm font-semibold ${vaccine === v ? 'text-white' : 'text-moka-mid'}`}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {vaccine === 'Other' && (
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mt-3"
              placeholder="Enter vaccine name..."
              value={customVaccine}
              onChangeText={setCustomVaccine}
              autoFocus
            />
          )}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Dosage</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 2ml"
              value={dosage}
              onChangeText={setDosage}
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

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Vet name</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="Dr. Kamau..."
              value={vetName}
              onChangeText={setVetName}
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Cost (KES)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="Total cost"
              keyboardType="decimal-pad"
              value={cost}
              onChangeText={setCost}
            />
          </View>
        </View>

        <TouchableOpacity
          className="rounded-xl py-4 items-center mt-2"
          style={{ backgroundColor: '#1ABC9C' }}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Vaccination</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
