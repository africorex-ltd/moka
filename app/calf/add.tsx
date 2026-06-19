import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSQLiteContext } from 'expo-sqlite'
import dayjs from 'dayjs'
import { generateId } from '@/lib/database'

interface Cow { local_id: string; name: string }

const GENDERS = ['heifer', 'bull']
const STATUSES = ['alive', 'weaned', 'sold', 'deceased', 'still_birth']

export default function AddCalfScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [cows, setCows] = useState<Cow[]>([])
  const [damId, setDamId] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('heifer')
  const [dob, setDob] = useState(dayjs().format('YYYY-MM-DD'))
  const [birthWeight, setBirthWeight] = useState('')
  const [sireCode, setSireCode] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [weightDate, setWeightDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [weanedDate, setWeanedDate] = useState('')
  const [weaningWeight, setWeaningWeight] = useState('')
  const [status, setStatus] = useState('alive')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.getAllAsync<Cow>(`SELECT local_id, name FROM cows WHERE deleted = 0 ORDER BY name`).then(setCows)
  }, [db])

  async function handleSave() {
    if (!damId) return Alert.alert('Select the dam (mother cow)')
    if (!dob) return Alert.alert('Enter date of birth')

    setSaving(true)
    const localId = generateId()
    const bw = parseFloat(birthWeight) || null
    const cw = parseFloat(currentWeight) || null
    const ww = parseFloat(weaningWeight) || null

    let growthRate: number | null = null
    if (bw && cw) {
      const days = dayjs(weightDate || dayjs()).diff(dayjs(dob), 'day')
      if (days > 0) growthRate = Math.round(((cw - bw) / days) * 1000) / 1000
    }

    await db.runAsync(
      `INSERT INTO calf_records
       (local_id, name, gender, date_of_birth, birth_body_weight_kg, dam_cow_local_id,
        sire_code, current_weight_kg, weight_recorded_date, growth_rate_per_day_kg,
        weaned_date, weaning_weight_kg, status, remarks, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        localId,
        name.trim() || null,
        gender,
        dob,
        bw,
        damId,
        sireCode.trim() || null,
        cw,
        currentWeight ? weightDate : null,
        growthRate,
        weanedDate.trim() || null,
        ww,
        status,
        remarks.trim() || null,
      ]
    )
    setSaving(false)
    router.back()
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-bold">Add Calf Record</Text>
          <Text className="text-moka-text text-xs">New calf born on farm</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">

        <View>
          <Text className="text-moka-mid text-sm mb-1">Calf name (optional)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="e.g. AFYA, SARAH..."
            value={name}
            onChangeText={setName}
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-2">Gender *</Text>
          <View className="flex-row gap-3">
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g}
                className={`flex-1 py-3 rounded-xl border items-center ${gender === g ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                onPress={() => setGender(g)}
              >
                <Text className={`font-semibold capitalize ${gender === g ? 'text-white' : 'text-moka-mid'}`}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-2">Dam (mother cow) *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {cows.map((c) => (
                <TouchableOpacity
                  key={c.local_id}
                  className={`px-4 py-2 rounded-full border ${damId === c.local_id ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                  onPress={() => setDamId(c.local_id)}
                >
                  <Text className={`text-sm font-semibold ${damId === c.local_id ? 'text-white' : 'text-moka-mid'}`}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Date of birth *</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Birth weight (kg)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 4.5"
              keyboardType="decimal-pad"
              value={birthWeight}
              onChangeText={setBirthWeight}
            />
          </View>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Sire code (AI bull code)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="e.g. 4110H885"
            value={sireCode}
            onChangeText={setSireCode}
          />
        </View>

        <View className="border border-gray-100 rounded-xl p-4 bg-gray-50">
          <Text className="text-moka-dark font-semibold text-sm mb-3">Current weight (optional)</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-moka-mid text-xs mb-1">Weight (kg)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark bg-white"
                placeholder="e.g. 100"
                keyboardType="decimal-pad"
                value={currentWeight}
                onChangeText={setCurrentWeight}
              />
            </View>
            <View className="flex-1">
              <Text className="text-moka-mid text-xs mb-1">Date recorded</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark bg-white"
                value={weightDate}
                onChangeText={setWeightDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Weaning date</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="YYYY-MM-DD"
              value={weanedDate}
              onChangeText={setWeanedDate}
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Weaning weight (kg)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 150"
              keyboardType="decimal-pad"
              value={weaningWeight}
              onChangeText={setWeaningWeight}
            />
          </View>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-2">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                className={`px-3 py-2 rounded-full border ${status === s ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                onPress={() => setStatus(s)}
              >
                <Text className={`text-xs font-semibold capitalize ${status === s ? 'text-white' : 'text-moka-mid'}`}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Remarks</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="Any observations..."
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={2}
          />
        </View>

        <TouchableOpacity
          className="bg-moka-green rounded-xl py-4 items-center mt-2"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Calf Record</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
