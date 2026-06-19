import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'expo-router'

export default function SuspendedScreen() {
  const { profile, setSession, setProfile } = useAuthStore()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    router.replace('/login')
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
        <Ionicons name="ban-outline" size={40} color="#C0392B" />
      </View>
      <Text className="text-moka-dark text-2xl font-bold text-center mb-3">Account Suspended</Text>
      <Text className="text-moka-mid text-base text-center mb-4">
        Your account has been suspended and you cannot access Moka at this time.
      </Text>
      {profile?.suspension_reason ? (
        <View className="bg-red-50 rounded-xl p-4 w-full mb-6">
          <Text className="text-moka-mid text-sm font-semibold mb-1">Reason:</Text>
          <Text className="text-moka-mid text-sm">{profile.suspension_reason}</Text>
        </View>
      ) : null}
      <Text className="text-moka-text text-sm text-center mb-8">
        Contact support if you believe this is an error.
      </Text>
      <TouchableOpacity
        className="bg-moka-green rounded-xl py-4 px-8"
        onPress={handleSignOut}
      >
        <Text className="text-white font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
