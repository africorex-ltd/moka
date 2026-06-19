import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSQLiteContext } from 'expo-sqlite'
import dayjs from 'dayjs'

interface CalfDetail {
  local_id: string
  name: string | null
  gender: string
  date_of_birth: string
  birth_body_weight_kg: number | null
  dam_cow_local_id: string
  dam_name: string
  sire_code: string | null
  current_weight_kg: number | null
  weight_recorded_date: string | null
  growth_rate_per_day_kg: number | null
  weaned_date: string | null
  weaning_weight_kg: number | null
  status: string
  remarks: string | null
}

const STATUS_COLORS: Record<string, string> = {
  alive: '#27AE60',
  weaned: '#2D5016',
  sold: '#B8860B',
  deceased: '#8A9E80',
  still_birth: '#C0392B',
}

const STATUSES = ['alive', 'weaned', 'sold', 'deceased', 'still_birth']

export default function CalfDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const db = useSQLiteContext()
  const router = useRouter()
  const [calf, setCalf] = useState<CalfDetail | null>(null)
  const [editingWeight, setEditingWeight] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newWeightDate, setNewWeightDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const row = await db.getFirstAsync<CalfDetail>(`
      SELECT cr.*, c.name as dam_name
      FROM calf_records cr
      LEFT JOIN cows c ON cr.dam_cow_local_id = c.local_id
      WHERE cr.local_id = ?
    `, [id])
    if (row) setCalf(row)
  }, [db, id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function updateStatus(newStatus: string) {
    await db.runAsync(
      `UPDATE calf_records SET status = ?, dirty = 1, updated_at = datetime('now') WHERE local_id = ?`,
      [newStatus, id]
    )
    load()
  }

  async function saveNewWeight() {
    const w = parseFloat(newWeight)
    if (isNaN(w) || w <= 0) return Alert.alert('Enter a valid weight')

    setSaving(true)
    let growthRate: number | null = null
    if (calf?.birth_body_weight_kg) {
      const days = dayjs(newWeightDate).diff(dayjs(calf.date_of_birth), 'day')
      if (days > 0) growthRate = Math.round(((w - calf.birth_body_weight_kg) / days) * 1000) / 1000
    }

    await db.runAsync(
      `UPDATE calf_records
       SET current_weight_kg = ?, weight_recorded_date = ?, growth_rate_per_day_kg = ?,
           dirty = 1, updated_at = datetime('now')
       WHERE local_id = ?`,
      [w, newWeightDate, growthRate, id]
    )
    setSaving(false)
    setEditingWeight(false)
    setNewWeight('')
    load()
  }

  async function handleDelete() {
    Alert.alert('Delete calf record', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await db.runAsync(
            `UPDATE calf_records SET deleted = 1, dirty = 1 WHERE local_id = ?`,
            [id]
          )
          router.back()
        },
      },
    ])
  }

  if (!calf) return <View className="flex-1 items-center justify-center"><Text className="text-moka-mid">Loading...</Text></View>

  const ageLabel = () => {
    const days = dayjs().diff(dayjs(calf.date_of_birth), 'day')
    if (days < 30) return `${days} days old`
    const months = dayjs().diff(dayjs(calf.date_of_birth), 'month')
    if (months < 12) return `${months} months old`
    return `${dayjs().diff(dayjs(calf.date_of_birth), 'year')} years old`
  }

  const statusColor = STATUS_COLORS[calf.status] ?? '#8A9E80'

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-moka-green px-4 pt-12 pb-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">{calf.name ?? 'Unnamed Calf'}</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: statusColor + '30' }}>
            <Text className="font-bold capitalize" style={{ color: statusColor === '#8A9E80' ? '#EAF2E3' : statusColor }}>
              {calf.status.replace('_', ' ')}
            </Text>
          </View>
          <Text className="text-moka-text text-sm capitalize">{calf.gender} calf - {ageLabel()}</Text>
        </View>
      </View>

      <View className="px-4 mt-4 gap-4">

        {/* Key stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm">
            <Text className="text-moka-text text-xs">Birth weight</Text>
            <Text className="text-moka-dark text-xl font-bold">
              {calf.birth_body_weight_kg ? `${calf.birth_body_weight_kg}kg` : '-'}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm">
            <Text className="text-moka-text text-xs">Current weight</Text>
            <Text className="text-moka-dark text-xl font-bold">
              {calf.current_weight_kg ? `${calf.current_weight_kg}kg` : '-'}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm">
            <Text className="text-moka-text text-xs">Growth/day</Text>
            <Text className="text-moka-success text-xl font-bold">
              {calf.growth_rate_per_day_kg ? `${calf.growth_rate_per_day_kg.toFixed(2)}kg` : '-'}
            </Text>
          </View>
        </View>

        {/* Update weight */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-moka-dark font-bold text-sm">Update Weight</Text>
            <TouchableOpacity onPress={() => setEditingWeight(!editingWeight)}>
              <Ionicons name={editingWeight ? 'close' : 'scale-outline'} size={20} color="#2D5016" />
            </TouchableOpacity>
          </View>
          {editingWeight && (
            <View className="gap-3">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-moka-mid text-xs mb-1">New weight (kg)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2 text-moka-dark"
                    placeholder="e.g. 150"
                    keyboardType="decimal-pad"
                    value={newWeight}
                    onChangeText={setNewWeight}
                    autoFocus
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-moka-mid text-xs mb-1">Date</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-2 text-moka-dark"
                    value={newWeightDate}
                    onChangeText={setNewWeightDate}
                  />
                </View>
              </View>
              <TouchableOpacity
                className="bg-moka-green rounded-xl py-3 items-center"
                onPress={saveNewWeight}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-sm">Save Weight</Text>}
              </TouchableOpacity>
            </View>
          )}
          {calf.current_weight_kg && calf.weight_recorded_date && (
            <Text className="text-moka-text text-xs">
              Last recorded: {calf.current_weight_kg}kg on {dayjs(calf.weight_recorded_date).format('D MMM YYYY')}
            </Text>
          )}
        </View>

        {/* Details */}
        <View className="bg-white rounded-2xl p-4 shadow-sm gap-3">
          <Text className="text-moka-dark font-bold text-sm">Details</Text>
          <View className="flex-row justify-between">
            <Text className="text-moka-text text-sm">Date of birth</Text>
            <Text className="text-moka-dark text-sm font-semibold">{dayjs(calf.date_of_birth).format('D MMM YYYY')}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-moka-text text-sm">Dam (mother)</Text>
            <TouchableOpacity onPress={() => router.push(`/cow/${calf.dam_cow_local_id}` as never)}>
              <Text className="text-moka-green text-sm font-semibold">{calf.dam_name ?? '-'}</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-moka-text text-sm">Sire code</Text>
            <Text className="text-moka-dark text-sm font-semibold">{calf.sire_code ?? '-'}</Text>
          </View>
          {calf.weaned_date && (
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Weaned</Text>
              <Text className="text-moka-dark text-sm font-semibold">
                {dayjs(calf.weaned_date).format('D MMM YYYY')}{calf.weaning_weight_kg ? ` at ${calf.weaning_weight_kg}kg` : ''}
              </Text>
            </View>
          )}
          {calf.remarks && (
            <View>
              <Text className="text-moka-text text-sm">Remarks</Text>
              <Text className="text-moka-dark text-sm mt-1">{calf.remarks}</Text>
            </View>
          )}
        </View>

        {/* Status update */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-moka-dark font-bold text-sm mb-3">Update Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                className={`px-3 py-2 rounded-full border ${calf.status === s ? 'border-moka-green' : 'border-gray-200'}`}
                style={calf.status === s ? { backgroundColor: '#2D501620' } : {}}
                onPress={() => updateStatus(s)}
              >
                <Text className={`text-xs font-semibold capitalize ${calf.status === s ? 'text-moka-green' : 'text-moka-mid'}`}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
      <View className="h-8" />
    </ScrollView>
  )
}
