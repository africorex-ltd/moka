import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const url = Linking.useURL()

  useEffect(() => {
    if (url) {
      supabase.auth.exchangeCodeForSession(url).then(({ error }) => {
        if (!error) router.replace('/')
      })
    }
  }, [url])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <View className="flex-1 items-center justify-center bg-moka-green">
      <ActivityIndicator size="large" color="#EAF2E3" />
    </View>
  )
}
