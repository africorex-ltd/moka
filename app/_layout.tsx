import { useEffect, Suspense } from 'react'
import { AppState, View, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite'
import * as Network from 'expo-network'
import '../global.css'
import { initDatabase } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { syncAll } from '@/lib/sync'
import { useAuthStore } from '@/store/auth'
import { useSyncStore } from '@/store/sync'

function DBLoading() {
  return (
    <View style={{ flex: 1, backgroundColor: '#2D5016', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#EAF2E3" />
    </View>
  )
}

export default function RootLayout() {
  return (
    <Suspense fallback={<DBLoading />}>
      <SQLiteProvider databaseName="moka.db" onInit={initDatabase} useSuspense>
        <AppCore />
      </SQLiteProvider>
    </Suspense>
  )
}

function AppCore() {
  const db = useSQLiteContext()
  const { setSession, setProfile, setLoading } = useAuthStore()
  const { setStatus, setIsSyncing, setLastSyncedAt } = useSyncStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        if (session) {
          // Load profile from cache first (offline-first), then update from remote
          const cached = await db.getFirstAsync<{ value: string | null }>(
            `SELECT value FROM meta WHERE key = 'cached_profile'`
          )
          if (cached?.value) {
            try {
              setProfile(JSON.parse(cached.value))
            } catch {
              // ignore parse error
            }
          }

          // Try to fetch from remote (fail-open: use cache if offline)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            setProfile(profile)
            await db.runAsync(
              `INSERT OR REPLACE INTO meta (key, value) VALUES ('cached_profile', ?)`,
              [JSON.stringify(profile)]
            )
          }
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // Sync + suspension check on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return

      const net = await Network.getNetworkStateAsync()
      if (!net.isConnected) {
        setStatus('offline')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Check suspension - fail-open if network error
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', session.user.id)
          .single()

        if (profile?.status === 'suspended') {
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
          return
        }
      } catch {
        // offline or error - do not lock out
      }

      // Background sync
      setIsSyncing(true)
      try {
        await syncAll(db, session.user.id)
        setStatus('synced')
        setLastSyncedAt(new Date().toISOString())
      } catch {
        // sync failed - keep existing status
      } finally {
        setIsSyncing(false)
      }
    })
    return () => sub.remove()
  }, [])

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
