import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import EmptyState from '@/components/EmptyState'

interface Cow {
  local_id: string
  name: string
  tag_number: string | null
  breed: string
  status: string
  date_acquired: string
  last_milk_date: string | null
  last_milk_litres: number | null
}

export default function HerdScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [cows, setCows] = useState<Cow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'dry' | 'sold'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<Cow>(`
      SELECT
        c.local_id, c.name, c.tag_number, c.breed, c.status, c.date_acquired,
        m.date as last_milk_date,
        m.quantity_litres as last_milk_litres
      FROM cows c
      LEFT JOIN (
        SELECT cow_local_id, date, quantity_litres
        FROM milk_log
        WHERE deleted = 0
        ORDER BY date DESC, updated_at DESC
      ) m ON m.cow_local_id = c.local_id
      WHERE c.deleted = 0
      GROUP BY c.local_id
      ORDER BY c.name ASC
    `)
    setCows(rows)
  }, [db])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const filtered = cows.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.tag_number ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  const statusColor = (s: string) =>
    s === 'active' ? '#27AE60' : s === 'dry' ? '#E67E22' : '#8A9E80'

  function renderCow({ item }: { item: Cow }) {
    return (
      <TouchableOpacity
        className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm flex-row items-center"
        onPress={() => router.push(`/cow/${item.local_id}` as never)}
      >
        <View className="w-12 h-12 rounded-full bg-moka-light items-center justify-center mr-3">
          <Text className="text-moka-green text-xl font-bold">{item.name[0]}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-moka-dark font-bold text-base">{item.name}</Text>
            {item.tag_number ? (
              <Text className="text-moka-text text-xs bg-gray-100 px-2 py-0.5 rounded-full">#{item.tag_number}</Text>
            ) : null}
          </View>
          <Text className="text-moka-text text-xs mt-0.5">{item.breed}</Text>
          {item.last_milk_date ? (
            <Text className="text-moka-mid text-xs mt-0.5">
              Last: {item.last_milk_litres}L on {item.last_milk_date}
            </Text>
          ) : null}
        </View>
        <View>
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: statusColor(item.status) + '20' }}
          >
            <Text className="text-xs font-semibold" style={{ color: statusColor(item.status) }}>
              {item.status}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#8A9E80" style={{ alignSelf: 'center', marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search + Add */}
      <View className="flex-row items-center px-4 pt-3 pb-2 gap-2">
        <View className="flex-1 flex-row items-center bg-white rounded-xl px-3 border border-gray-200">
          <Ionicons name="search-outline" size={16} color="#8A9E80" />
          <TextInput
            className="flex-1 py-3 px-2 text-moka-dark text-sm"
            placeholder="Search by name or tag..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          className="bg-moka-green w-10 h-10 rounded-xl items-center justify-center"
          onPress={() => router.push('/cow/add')}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View className="flex-row px-4 pb-3 gap-2">
        {(['all', 'active', 'dry', 'sold'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            className={`px-3 py-1.5 rounded-full ${filter === f ? 'bg-moka-green' : 'bg-white border border-gray-200'}`}
            onPress={() => setFilter(f)}
          >
            <Text className={`text-xs font-semibold capitalize ${filter === f ? 'text-white' : 'text-moka-mid'}`}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.local_id}
        renderItem={renderCow}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
            message="No cows yet"
            sub='Tap "+" to add your first cow'
          />
        }
      />
    </View>
  )
}
