import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'

interface Cow {
  local_id: string
  name: string
  tag_number: string | null
  breed: string
  status: string
  date_of_birth: string | null
  date_acquired: string
  acquisition_cost: number
  notes: string | null
  sire_code: string | null
  dam_name: string | null
  live_weight_kg: number | null
  body_condition_score: number | null
}

interface CalfRow {
  local_id: string
  name: string | null
  gender: string
  date_of_birth: string
  birth_weight_kg: number | null
}

interface MilkEntry {
  local_id: string
  date: string
  session: string
  quantity_litres: number
}

interface HealthEntry {
  local_id: string
  date: string
  event_type: string
  description: string
  cost: number
}

export default function CowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const db = useSQLiteContext()
  const router = useRouter()
  const [cow, setCow] = useState<Cow | null>(null)
  const [milkHistory, setMilkHistory] = useState<MilkEntry[]>([])
  const [healthHistory, setHealthHistory] = useState<HealthEntry[]>([])
  const [calves, setCalves] = useState<CalfRow[]>([])
  const [stats, setStats] = useState({ monthTotal: 0, weekAvg: 0, totalDays: 0 })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const [cowRow, milk, health, calvesRows] = await Promise.all([
      db.getFirstAsync<Cow>(`SELECT * FROM cows WHERE local_id = ?`, [id]),
      db.getAllAsync<MilkEntry>(
        `SELECT local_id, date, session, quantity_litres FROM milk_log
         WHERE cow_local_id = ? AND deleted = 0 ORDER BY date DESC LIMIT 10`,
        [id]
      ),
      db.getAllAsync<HealthEntry>(
        `SELECT local_id, date, event_type, description, cost FROM health_log
         WHERE cow_local_id = ? AND deleted = 0 AND event_type != 'vaccine' ORDER BY date DESC LIMIT 5`,
        [id]
      ),
      db.getAllAsync<CalfRow>(
        `SELECT local_id, name, gender, date_of_birth, birth_weight_kg FROM calf_records WHERE dam_cow_local_id = ? AND deleted = 0 ORDER BY date_of_birth DESC`,
        [id]
      ),
    ])
    setCow(cowRow)
    setMilkHistory(milk)
    setHealthHistory(health)
    setCalves(calvesRows)

    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
    const weekStart = dayjs().subtract(6, 'day').format('YYYY-MM-DD')
    const [monthRow, weekRow, daysRow] = await Promise.all([
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(quantity_litres), 0) as total FROM milk_log
         WHERE cow_local_id = ? AND date >= ? AND deleted = 0`,
        [id, monthStart]
      ),
      db.getFirstAsync<{ avg: number }>(
        `SELECT COALESCE(AVG(daily), 0) as avg FROM (
           SELECT date, SUM(quantity_litres) as daily FROM milk_log
           WHERE cow_local_id = ? AND date >= ? AND deleted = 0 GROUP BY date
         )`,
        [id, weekStart]
      ),
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(DISTINCT date) as count FROM milk_log WHERE cow_local_id = ? AND deleted = 0`,
        [id]
      ),
    ])
    setStats({
      monthTotal: monthRow?.total ?? 0,
      weekAvg: weekRow?.avg ?? 0,
      totalDays: daysRow?.count ?? 0,
    })
  }, [db, id])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  async function handleDelete() {
    Alert.alert('Remove Cow', `Remove ${cow?.name} from your herd?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync(
            `UPDATE cows SET deleted = 1, dirty = 1 WHERE local_id = ?`,
            [id]
          )
          router.back()
        },
      },
    ])
  }

  if (!cow) return null

  const statusColor = cow.status === 'active' ? '#27AE60' : cow.status === 'dry' ? '#E67E22' : '#8A9E80'

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
    >
      {/* Header */}
      <View className="bg-moka-green px-4 pt-12 pb-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">{cow.name}</Text>
          <TouchableOpacity onPress={() => router.push(`/cow/edit/${id}` as never)} className="mr-3">
            <Ionicons name="pencil-outline" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color="#FCA5A5" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-3 flex-wrap">
          {cow.tag_number ? (
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-xs">#{cow.tag_number}</Text>
            </View>
          ) : null}
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-white text-xs">{cow.breed}</Text>
          </View>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusColor + '30' }}>
            <Text className="text-xs font-semibold capitalize" style={{ color: '#EAF2E3' }}>{cow.status}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row mx-4 -mt-4 gap-3">
        <View className="flex-1 bg-white rounded-2xl p-3 shadow-sm items-center">
          <Text className="text-moka-text text-xs">Month total</Text>
          <Text className="text-moka-dark font-bold text-lg mt-1">{stats.monthTotal.toFixed(1)}L</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-3 shadow-sm items-center">
          <Text className="text-moka-text text-xs">7-day avg</Text>
          <Text className="text-moka-dark font-bold text-lg mt-1">{stats.weekAvg.toFixed(1)}L</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-3 shadow-sm items-center">
          <Text className="text-moka-text text-xs">Logged days</Text>
          <Text className="text-moka-dark font-bold text-lg mt-1">{stats.totalDays}</Text>
        </View>
      </View>

      {/* Info */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <Text className="text-moka-dark font-bold text-sm mb-3">Details</Text>
        <View className="gap-2">
          {cow.date_of_birth ? (
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Date of birth</Text>
              <Text className="text-moka-dark text-sm">{cow.date_of_birth}</Text>
            </View>
          ) : null}
          <View className="flex-row justify-between">
            <Text className="text-moka-text text-sm">Date acquired</Text>
            <Text className="text-moka-dark text-sm">{cow.date_acquired}</Text>
          </View>
          {cow.acquisition_cost > 0 ? (
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Purchase cost</Text>
              <Text className="text-moka-dark text-sm">KES {cow.acquisition_cost.toLocaleString()}</Text>
            </View>
          ) : null}
          {cow.sire_code ? (
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Sire code</Text>
              <Text className="text-moka-dark text-sm">{cow.sire_code}</Text>
            </View>
          ) : null}
          {cow.dam_name ? (
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Dam</Text>
              <Text className="text-moka-dark text-sm">{cow.dam_name}</Text>
            </View>
          ) : null}
          {cow.live_weight_kg ? (
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">Live weight</Text>
              <Text className="text-moka-dark text-sm">{cow.live_weight_kg} kg</Text>
            </View>
          ) : null}
          {cow.body_condition_score ? (
            <View className="flex-row justify-between">
              <Text className="text-moka-text text-sm">BCS</Text>
              <Text className="text-moka-dark text-sm">{cow.body_condition_score}/5</Text>
            </View>
          ) : null}
          {cow.notes ? (
            <View>
              <Text className="text-moka-text text-sm">Notes</Text>
              <Text className="text-moka-dark text-sm mt-1">{cow.notes}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Quick actions */}
      <View className="mx-4 mt-4 flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-moka-green rounded-xl py-3 items-center"
          onPress={() => router.push(`/log/milk?cowId=${id}` as never)}
        >
          <Ionicons name="water-outline" size={18} color="white" />
          <Text className="text-white text-xs font-semibold mt-1">Milk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-white border border-moka-danger rounded-xl py-3 items-center"
          onPress={() => router.push(`/log/health?cowId=${id}` as never)}
        >
          <Ionicons name="medkit-outline" size={18} color="#C0392B" />
          <Text className="text-xs font-semibold mt-1" style={{ color: '#C0392B' }}>Health</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-white border border-moka-gold rounded-xl py-3 items-center"
          onPress={() => router.push(`/log/feeding?cowId=${id}` as never)}
        >
          <Ionicons name="nutrition-outline" size={18} color="#B8860B" />
          <Text className="text-xs font-semibold mt-1" style={{ color: '#B8860B' }}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-white border border-purple-300 rounded-xl py-3 items-center"
          onPress={() => router.push(`/ration/${id}` as never)}
        >
          <Ionicons name="flask-outline" size={18} color="#9B59B6" />
          <Text className="text-xs font-semibold mt-1" style={{ color: '#9B59B6' }}>Ration</Text>
        </TouchableOpacity>
      </View>

      {/* Milk history */}
      {milkHistory.length > 0 && (
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <Text className="text-moka-dark font-bold text-sm px-4 py-3 border-b border-gray-100">Milk History</Text>
          {milkHistory.map((m, i) => (
            <View key={m.local_id} className={`flex-row items-center px-4 py-3 ${i < milkHistory.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <Ionicons name="water-outline" size={16} color="#2D5016" className="mr-3" />
              <View className="flex-1 ml-3">
                <Text className="text-moka-dark text-sm">{m.session}</Text>
                <Text className="text-moka-text text-xs">{m.date}</Text>
              </View>
              <Text className="text-moka-green font-bold text-sm">{m.quantity_litres}L</Text>
            </View>
          ))}
        </View>
      )}

      {/* Calves */}
      {calves.length > 0 && (
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <Text className="text-moka-dark font-bold text-sm px-4 py-3 border-b border-gray-100">Calves ({calves.length})</Text>
          {calves.map((c, i) => (
            <TouchableOpacity
              key={c.local_id}
              className={`flex-row items-center px-4 py-3 ${i < calves.length - 1 ? 'border-b border-gray-100' : ''}`}
              onPress={() => router.push(`/calf/${c.local_id}` as never)}
            >
              <Ionicons name="leaf-outline" size={16} color="#27AE60" />
              <View className="flex-1 ml-3">
                <Text className="text-moka-dark text-sm">{c.name || 'Unnamed'} ({c.gender})</Text>
                <Text className="text-moka-text text-xs">{c.date_of_birth}{c.birth_weight_kg ? ` — ${c.birth_weight_kg}kg` : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#8A9E80" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Health history */}
      {healthHistory.length > 0 && (
        <View className="mx-4 mt-4 mb-6 bg-white rounded-2xl shadow-sm overflow-hidden">
          <Text className="text-moka-dark font-bold text-sm px-4 py-3 border-b border-gray-100">Health History</Text>
          {healthHistory.map((h, i) => (
            <View key={h.local_id} className={`px-4 py-3 ${i < healthHistory.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <View className="flex-row justify-between">
                <Text className="text-moka-dark text-sm font-semibold">{h.event_type}</Text>
                <Text className="text-moka-text text-xs">{dayjs(h.date).format('D MMM')}</Text>
              </View>
              <Text className="text-moka-text text-xs mt-0.5">{h.description}</Text>
              {h.cost > 0 ? <Text className="text-moka-mid text-xs mt-0.5">KES {h.cost.toLocaleString()}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
