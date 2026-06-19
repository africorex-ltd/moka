import { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'

interface CalfRecord {
  local_id: string
  name: string | null
  gender: string
  date_of_birth: string
  dam_name: string
  sire_code: string | null
  status: string
  birth_body_weight_kg: number | null
  current_weight_kg: number | null
  growth_rate_per_day_kg: number | null
  weaned_date: string | null
}

const STATUS_COLORS: Record<string, string> = {
  alive: '#27AE60',
  weaned: '#2D5016',
  sold: '#B8860B',
  deceased: '#8A9E80',
  still_birth: '#C0392B',
}

export default function CalvesScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [calves, setCalves] = useState<CalfRecord[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'alive' | 'weaned' | 'sold'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<CalfRecord>(`
      SELECT cr.*, c.name as dam_name
      FROM calf_records cr
      LEFT JOIN cows c ON cr.dam_cow_local_id = c.local_id
      WHERE cr.deleted = 0
      ORDER BY cr.date_of_birth DESC
    `)
    setCalves(rows)
  }, [db])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const filtered = calves.filter((c) => {
    const matchesSearch = !search || (c.name ?? '').toLowerCase().includes(search.toLowerCase()) || c.dam_name?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || c.status === filter
    return matchesSearch && matchesFilter
  })

  const ageLabel = (dob: string) => {
    const days = dayjs().diff(dayjs(dob), 'day')
    if (days < 30) return `${days}d old`
    const months = dayjs().diff(dayjs(dob), 'month')
    if (months < 12) return `${months}mo old`
    return `${dayjs().diff(dayjs(dob), 'year')}yr old`
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search" size={16} color="#8A9E80" />
          <TextInput
            className="flex-1 ml-2 text-moka-dark text-sm"
            placeholder="Search calves or dam..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-row gap-2 mt-3">
          {(['all', 'alive', 'weaned', 'sold'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              className={`px-3 py-1.5 rounded-full ${filter === f ? 'bg-moka-green' : 'bg-gray-100'}`}
              onPress={() => setFilter(f)}
            >
              <Text className={`text-xs font-semibold capitalize ${filter === f ? 'text-white' : 'text-moka-mid'}`}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.local_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <Ionicons name="leaf-outline" size={48} color="#8A9E80" />
            <Text className="text-moka-mid text-base font-semibold mt-3">No calves yet</Text>
            <Text className="text-moka-text text-sm mt-1">Add calf records from the breeding log</Text>
          </View>
        }
        ListFooterComponent={<View className="h-4" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 shadow-sm"
            onPress={() => router.push(`/calf/${item.local_id}` as never)}
          >
            <View className="flex-row items-start">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-moka-dark font-bold text-base">
                    {item.name ?? 'Unnamed'}
                  </Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] + '20' }}>
                    <Text className="text-xs font-semibold capitalize" style={{ color: STATUS_COLORS[item.status] }}>
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text className="text-moka-mid text-sm mt-0.5">
                  {item.gender === 'bull' ? 'Bull calf' : 'Heifer calf'} - {ageLabel(item.date_of_birth)}
                </Text>
                <Text className="text-moka-text text-xs mt-1">
                  Dam: {item.dam_name ?? '-'}{item.sire_code ? ` - Sire: ${item.sire_code}` : ''}
                </Text>
              </View>
              <View className="items-end">
                {item.birth_body_weight_kg && (
                  <Text className="text-moka-text text-xs">Born: {item.birth_body_weight_kg}kg</Text>
                )}
                {item.current_weight_kg && (
                  <Text className="text-moka-dark text-sm font-semibold mt-1">{item.current_weight_kg}kg</Text>
                )}
                {item.growth_rate_per_day_kg && (
                  <Text className="text-moka-success text-xs">+{item.growth_rate_per_day_kg.toFixed(2)}kg/day</Text>
                )}
              </View>
            </View>
            {item.weaned_date && (
              <View className="mt-2 pt-2 border-t border-gray-100">
                <Text className="text-moka-text text-xs">Weaned: {dayjs(item.weaned_date).format('D MMM YYYY')}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-moka-green rounded-full w-14 h-14 items-center justify-center shadow-lg"
        onPress={() => router.push('/calf/add' as never)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  )
}
