import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Network from 'expo-network'
import { useSQLiteContext } from 'expo-sqlite'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { supabase } from '@/lib/supabase'
import { syncAll, getLastSyncTime } from '@/lib/sync'
import { useSyncStore } from '@/store/sync'

dayjs.extend(relativeTime)

interface DirtyCount {
  table: string
  count: number
}

export default function SyncScreen() {
  const router = useRouter()
  const db = useSQLiteContext()
  const { status, isSyncing, lastSyncedAt, setStatus, setIsSyncing, setLastSyncedAt } = useSyncStore()
  const [isOnline, setIsOnline] = useState(false)
  const [dirtyCounts, setDirtyCounts] = useState<DirtyCount[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)

  const load = useCallback(async () => {
    const net = await Network.getNetworkStateAsync()
    setIsOnline(net.isConnected ?? false)

    const tables = ['cows', 'milk_log', 'feeding_log', 'health_log', 'breeding_log', 'milk_sales', 'farm_costs']
    const counts: DirtyCount[] = []
    for (const t of tables) {
      const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${t} WHERE (dirty = 1 OR synced = 0) AND deleted = 0`
      )
      if (row && row.count > 0) {
        counts.push({ table: t.replace(/_/g, ' '), count: row.count })
      }
    }
    setDirtyCounts(counts)
    const ls = await getLastSyncTime(db)
    setLastSync(ls)
  }, [db])

  useEffect(() => { load() }, [load])

  async function handleManualSync() {
    const net = await Network.getNetworkStateAsync()
    if (!net.isConnected) {
      return Alert.alert('Offline', 'You need an internet connection to sync')
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return Alert.alert('Not signed in')

    setIsSyncing(true)
    try {
      await syncAll(db, session.user.id)
      setStatus('synced')
      const ls = new Date().toISOString()
      setLastSyncedAt(ls)
      setLastSync(ls)
      await load()
      Alert.alert('Synced', 'Your data is up to date')
    } catch (e: unknown) {
      Alert.alert('Sync failed', (e as Error).message ?? 'Unknown error')
    } finally {
      setIsSyncing(false)
    }
  }

  const statusColor = status === 'synced' ? '#27AE60' : status === 'offline' ? '#8A9E80' : '#E67E22'
  const statusLabel = status === 'synced' ? 'Synced' : status === 'offline' ? 'Offline' : 'Changes pending'

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Sync Status</Text>
      </View>

      {/* Status card */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm">
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />
          <Text className="text-moka-dark font-bold text-base">{statusLabel}</Text>
          {isSyncing && <ActivityIndicator size="small" color="#2D5016" />}
        </View>

        <View className="gap-3">
          <View className="flex-row justify-between">
            <Text className="text-moka-text text-sm">Network</Text>
            <Text className={`text-sm font-semibold ${isOnline ? 'text-moka-success' : 'text-moka-text'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-moka-text text-sm">Last synced</Text>
            <Text className="text-moka-dark text-sm">
              {lastSync ? dayjs(lastSync).fromNow() : 'Never'}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-moka-text text-sm">Unsynced records</Text>
            <Text className="text-moka-dark text-sm font-semibold">
              {dirtyCounts.reduce((s, d) => s + d.count, 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Dirty counts */}
      {dirtyCounts.length > 0 && (
        <View className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <Text className="text-moka-gold font-semibold text-sm mb-3">Pending sync</Text>
          {dirtyCounts.map((d) => (
            <View key={d.table} className="flex-row justify-between py-1">
              <Text className="text-moka-mid text-sm capitalize">{d.table}</Text>
              <Text className="text-moka-gold font-semibold text-sm">{d.count} records</Text>
            </View>
          ))}
        </View>
      )}

      {/* Sync button */}
      <View className="mx-4 mt-4">
        <TouchableOpacity
          className="bg-moka-green rounded-xl py-4 items-center flex-row justify-center gap-2"
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="sync-outline" size={20} color="white" />
              <Text className="text-white font-bold">Sync Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View className="mx-4 mt-4 bg-moka-light rounded-2xl p-4">
        <Text className="text-moka-green font-semibold text-sm mb-2">How sync works</Text>
        <Text className="text-moka-mid text-xs leading-5">
          Moka works offline first. All your data is saved locally on your phone. When you have an internet connection, Moka automatically syncs your data to the cloud so it is safe and accessible from any device.
        </Text>
      </View>

      <View className="h-8" />
    </ScrollView>
  )
}
