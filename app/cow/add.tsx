import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSQLiteContext } from 'expo-sqlite'
import dayjs from 'dayjs'
import { generateId } from '@/lib/database'

const BREEDS = ['Friesian', 'Ayrshire', 'Jersey', 'Guernsey', 'Cross-breed', 'Local']
const STATUSES = ['active', 'dry', 'pregnant', 'sold']

export default function AddCowScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [breed, setBreed] = useState('Friesian')
  const [dob, setDob] = useState('')
  const [dateAcquired, setDateAcquired] = useState(dayjs().format('YYYY-MM-DD'))
  const [cost, setCost] = useState('')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')
  const [sireCode, setSireCode] = useState('')
  const [damName, setDamName] = useState('')
  const [liveWeight, setLiveWeight] = useState('')
  const [bcs, setBcs] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Enter the cow name')

    setSaving(true)
    const id = generateId()
    await db.runAsync(
      `INSERT INTO cows (local_id, name, tag_number, breed, date_of_birth, date_acquired, acquisition_cost, status, notes, sire_code, dam_name, live_weight_kg, body_condition_score, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        name.trim(),
        tag.trim() || null,
        breed,
        dob.trim() || null,
        dateAcquired,
        parseFloat(cost) || 0,
        status,
        notes.trim() || null,
        sireCode.trim() || null,
        damName.trim() || null,
        parseFloat(liveWeight) || null,
        parseFloat(bcs) || null,
      ]
    )
    setSaving(false)
    router.back()
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Add Cow</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text className="text-moka-mid text-sm mb-1">Name *</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="e.g. Daisy"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Tag number</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="e.g. K001"
            value={tag}
            onChangeText={setTag}
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-2">Breed</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {BREEDS.map((b) => (
                <TouchableOpacity
                  key={b}
                  className={`px-3 py-2 rounded-full border ${breed === b ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                  onPress={() => setBreed(b)}
                >
                  <Text className={`text-sm font-semibold ${breed === b ? 'text-white' : 'text-moka-mid'}`}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Date of birth</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="YYYY-MM-DD"
            value={dob}
            onChangeText={setDob}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Date acquired *</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="YYYY-MM-DD"
            value={dateAcquired}
            onChangeText={setDateAcquired}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Purchase cost (KES)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="e.g. 80000"
            keyboardType="decimal-pad"
            value={cost}
            onChangeText={setCost}
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-2">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                className={`px-3 py-2 rounded-full border capitalize ${status === s ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                onPress={() => setStatus(s)}
              >
                <Text className={`text-sm font-semibold capitalize ${status === s ? 'text-white' : 'text-moka-mid'}`}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Sire code</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. KARI-001"
              value={sireCode}
              onChangeText={setSireCode}
              autoCapitalize="characters"
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Dam name</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. Bella"
              value={damName}
              onChangeText={setDamName}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">Live weight (kg)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 450"
              keyboardType="decimal-pad"
              value={liveWeight}
              onChangeText={setLiveWeight}
            />
          </View>
          <View className="flex-1">
            <Text className="text-moka-mid text-sm mb-1">BCS (1-5)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
              placeholder="e.g. 3.0"
              keyboardType="decimal-pad"
              value={bcs}
              onChangeText={setBcs}
            />
          </View>
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Notes</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            placeholder="Any additional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          className="bg-moka-green rounded-xl py-4 items-center mt-2"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Cow</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
