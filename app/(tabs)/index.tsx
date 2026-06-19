import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter } from 'expo-router'
import dayjs from 'dayjs'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/store/auth'

interface DashStats {
  todayMilk: number
  activeCows: number
  pendingReminders: number
  monthRevenue: number
}

interface QuickAction {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  route: string
  color: string
}

const ACTIONS: QuickAction[] = [
  { label: 'Log Milk', icon: 'water-outline', route: '/log/milk', color: '#2D5016' },
  { label: 'Log Health', icon: 'medkit-outline', route: '/log/health', color: '#C0392B' },
  { label: 'Log Feed', icon: 'nutrition-outline', route: '/log/feeding', color: '#B8860B' },
  { label: 'Add Cow', icon: 'add-circle-outline', route: '/cow/add', color: '#4A5540' },
]

export default function DashboardScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState<DashStats>({ todayMilk: 0, activeCows: 0, pendingReminders: 0, monthRevenue: 0 })
  const [recentMilk, setRecentMilk] = useState<{ cow_name: string; quantity_litres: number; session: string; date: string }[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const today = dayjs().format('YYYY-MM-DD')
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')

    const [milkRow, cowRow, remRow, revRow] = await Promise.all([
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(quantity_litres), 0) as total FROM milk_log WHERE date = ? AND deleted = 0`,
        [today]
      ),
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM cows WHERE status = 'active' AND deleted = 0`
      ),
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM health_log WHERE next_due_date <= ? AND deleted = 0`,
        [today]
      ),
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(quantity_litres * price_per_litre), 0) as total FROM milk_sales WHERE date >= ? AND deleted = 0`,
        [monthStart]
      ),
    ])

    setStats({
      todayMilk: milkRow?.total ?? 0,
      activeCows: cowRow?.count ?? 0,
      pendingReminders: remRow?.count ?? 0,
      monthRevenue: revRow?.total ?? 0,
    })

    const recent = await db.getAllAsync<{ cow_name: string; quantity_litres: number; session: string; date: string }>(
      `SELECT c.name as cow_name, m.quantity_litres, m.session, m.date
       FROM milk_log m JOIN cows c ON m.cow_local_id = c.local_id
       WHERE m.deleted = 0 ORDER BY m.date DESC, m.updated_at DESC LIMIT 5`
    )
    setRecentMilk(recent)
  }, [db])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const milkPrice = profile?.default_milk_price ?? 60

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
    >
      {/* Header card */}
      <View className="bg-moka-green px-5 pt-4 pb-6">
        <Text className="text-moka-text text-sm">{dayjs().format('dddd, D MMMM YYYY')}</Text>
        <Text className="text-white text-xl font-bold mt-1">
          {profile?.farm_name ?? 'My Farm'}
        </Text>
      </View>

      {/* Stats row */}
      <View className="flex-row mx-4 -mt-4 gap-3">
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-moka-text text-xs">Today's milk</Text>
          <Text className="text-moka-dark text-2xl font-bold mt-1">{stats.todayMilk.toFixed(1)} L</Text>
          <Text className="text-moka-success text-xs mt-1">KES {(stats.todayMilk * milkPrice).toLocaleString()}</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-moka-text text-xs">Active cows</Text>
          <Text className="text-moka-dark text-2xl font-bold mt-1">{stats.activeCows}</Text>
          {stats.pendingReminders > 0 ? (
            <Text className="text-moka-danger text-xs mt-1">{stats.pendingReminders} reminder{stats.pendingReminders > 1 ? 's' : ''} due</Text>
          ) : (
            <Text className="text-moka-success text-xs mt-1">All healthy</Text>
          )}
        </View>
      </View>

      <View className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
        <Text className="text-moka-text text-xs">Revenue this month</Text>
        <Text className="text-moka-dark text-2xl font-bold mt-1">KES {stats.monthRevenue.toLocaleString()}</Text>
      </View>

      {/* Quick actions */}
      <View className="mx-4 mt-5">
        <Text className="text-moka-dark font-bold text-base mb-3">Quick Log</Text>
        <View className="flex-row flex-wrap gap-3">
          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.route}
              className="bg-white rounded-2xl p-4 items-center shadow-sm"
              style={{ width: '47%' }}
              onPress={() => router.push(a.route as never)}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-2"
                style={{ backgroundColor: a.color + '20' }}
              >
                <Ionicons name={a.icon} size={24} color={a.color} />
              </View>
              <Text className="text-moka-dark text-sm font-semibold">{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent milk */}
      {recentMilk.length > 0 && (
        <View className="mx-4 mt-5 mb-6">
          <Text className="text-moka-dark font-bold text-base mb-3">Recent Milk</Text>
          <View className="bg-white rounded-2xl shadow-sm">
            {recentMilk.map((r, i) => (
              <View
                key={i}
                className={`flex-row items-center px-4 py-3 ${i < recentMilk.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <View className="w-8 h-8 rounded-full bg-moka-light items-center justify-center mr-3">
                  <Ionicons name="water-outline" size={16} color="#2D5016" />
                </View>
                <View className="flex-1">
                  <Text className="text-moka-dark text-sm font-semibold">{r.cow_name}</Text>
                  <Text className="text-moka-text text-xs">{r.session} - {r.date}</Text>
                </View>
                <Text className="text-moka-green font-bold text-sm">{r.quantity_litres} L</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}
