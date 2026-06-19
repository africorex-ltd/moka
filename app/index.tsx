import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/store/auth'

export default function Index() {
  const router = useRouter()
  const { session, profile, loading } = useAuthStore()

  useEffect(() => {
    if (loading) return

    if (!session) {
      router.replace('/login')
    } else if (!profile?.farm_name) {
      router.replace('/onboarding')
    } else {
      router.replace('/(tabs)')
    }
  }, [session, profile, loading])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D5016' }}>
      <ActivityIndicator size="large" color="#EAF2E3" />
    </View>
  )
}
