import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'

interface RecentEntry {
  local_id: string
  cow_name: string
  date: string
  summary: string
}

export default function RecordsScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [recentMilk, setRecentMilk] = useState<RecentEntry[]>([])
  const [recentHealth, setRecentHealth] = useState<RecentEntry[]>([])
  const [recentVax, setRecentVax] = useState<RecentEntry[]>([])
  const [recentFeeding, setRecentFeeding] = useState<RecentEntry[]>([])
  const [recentBreeding, setRecentBreeding] = useState<RecentEntry[]>([])
  const [recentCalves, setRecentCalves] = useState<RecentEntry[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const [milk, health, vax, feeding, breeding, calves] = await Promise.all([
      db.getAllAsync<RecentEntry>(`
        SELECT m.local_id, c.name as cow_name, m.date,
          (m.session || ' - ' || m.quantity_litres || 'L') as summary
        FROM milk_log m JOIN cows c ON m.cow_local_id = c.local_id
        WHERE m.deleted = 0 ORDER BY m.date DESC LIMIT 4
      `),
      db.getAllAsync<RecentEntry>(`
        SELECT h.local_id, c.name as cow_name, h.date, h.event_type as summary
        FROM health_log h JOIN cows c ON h.cow_local_id = c.local_id
        WHERE h.deleted = 0 AND h.event_type != 'vaccine'
        ORDER BY h.date DESC LIMIT 4
      `),
      db.getAllAsync<RecentEntry>(`
        SELECT h.local_id, c.name as cow_name, h.date, h.description as summary
        FROM health_log h JOIN cows c ON h.cow_local_id = c.local_id
        WHERE h.deleted = 0 AND h.event_type = 'vaccine'
        ORDER BY h.date DESC LIMIT 4
      `),
      db.getAllAsync<RecentEntry>(`
        SELECT f.local_id, c.name as cow_name, f.date,
          (f.feed_type || ' - ' || f.quantity_kg || 'kg') as summary
        FROM feeding_log f JOIN cows c ON f.cow_local_id = c.local_id
        WHERE f.deleted = 0 ORDER BY f.date DESC LIMIT 4
      `),
      db.getAllAsync<RecentEntry>(`
        SELECT b.local_id, c.name as cow_name, b.date, b.event_type as summary
        FROM breeding_log b JOIN cows c ON b.cow_local_id = c.local_id
        WHERE b.deleted = 0 ORDER BY b.date DESC LIMIT 4
      `),
      db.getAllAsync<RecentEntry>(`
        SELECT cr.local_id, COALESCE(cr.name, 'Unnamed') as cow_name, cr.date_of_birth as date,
          (cr.gender || ' - dam: ' || COALESCE(c.name, '?')) as summary
        FROM calf_records cr
        LEFT JOIN cows c ON cr.dam_cow_local_id = c.local_id
        WHERE cr.deleted = 0 ORDER BY cr.date_of_birth DESC LIMIT 4
      `),
    ])
    setRecentMilk(milk)
    setRecentHealth(health)
    setRecentVax(vax)
    setRecentFeeding(feeding)
    setRecentBreeding(breeding)
    setRecentCalves(calves)
  }, [db])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const sections = [
    { title: 'Milk Log', icon: 'water-outline' as const, color: '#2D5016', items: recentMilk, logRoute: '/log/milk' },
    { title: 'Health Events', icon: 'medkit-outline' as const, color: '#C0392B', items: recentHealth, logRoute: '/log/health' },
    { title: 'Vaccinations', icon: 'shield-checkmark-outline' as const, color: '#1ABC9C', items: recentVax, logRoute: '/log/vaccination' },
    { title: 'Feeding Log', icon: 'nutrition-outline' as const, color: '#B8860B', items: recentFeeding, logRoute: '/log/feeding' },
    { title: 'Breeding Log', icon: 'heart-circle-outline' as const, color: '#9B59B6', items: recentBreeding, logRoute: '/log/breeding' },
    { title: 'Calf Records', icon: 'leaf-outline' as const, color: '#27AE60', items: recentCalves, logRoute: '/calf/add' },
  ]

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
    >
      <View className="px-4 py-4 gap-4">
        {sections.map((s) => (
          <View key={s.title} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <Ionicons name={s.icon} size={18} color={s.color} />
                <Text className="text-moka-dark font-bold text-sm">{s.title}</Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: s.color + '18' }}
                onPress={() => router.push(s.logRoute as never)}
              >
                <Ionicons name="add" size={14} color={s.color} />
                <Text className="text-xs font-semibold" style={{ color: s.color }}>Log</Text>
              </TouchableOpacity>
            </View>

            {s.items.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-moka-text text-sm">No entries yet</Text>
              </View>
            ) : (
              s.items.map((item, i) => (
                <View
                  key={item.local_id}
                  className={`flex-row items-center px-4 py-3 ${i < s.items.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-moka-dark text-sm font-semibold">{item.cow_name}</Text>
                    <Text className="text-moka-text text-xs capitalize">{item.summary}</Text>
                  </View>
                  <Text className="text-moka-text text-xs">{dayjs(item.date).format('D MMM')}</Text>
                </View>
              ))
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
