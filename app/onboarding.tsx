import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export default function OnboardingScreen() {
  const router = useRouter()
  const { session, setProfile } = useAuthStore()
  const [farmName, setFarmName] = useState('')
  const [location, setLocation] = useState('')
  const [milkPrice, setMilkPrice] = useState('60')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!farmName.trim()) return Alert.alert('Enter your farm name')
    if (!location.trim()) return Alert.alert('Enter your location')

    setLoading(true)
    const price = parseFloat(milkPrice) || 60

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: session!.user.id,
        farm_name: farmName.trim(),
        location: location.trim(),
        default_milk_price: price,
      })
      .select()
      .single()

    if (error) {
      setLoading(false)
      return Alert.alert('Error', error.message)
    }

    setProfile(data)
    setLoading(false)
    router.replace('/(tabs)')
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="bg-moka-green px-6 pt-16 pb-8">
          <View className="w-14 h-14 rounded-full bg-moka-light items-center justify-center mb-4">
            <Ionicons name="leaf" size={28} color="#2D5016" />
          </View>
          <Text className="text-white text-2xl font-bold">Set up your farm</Text>
          <Text className="text-moka-text text-sm mt-1">This takes 30 seconds</Text>
        </View>

        <View className="px-6 pt-8">
          <Text className="text-moka-mid text-sm mb-2">Farm name</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-4"
            placeholder="Kamau Family Farm"
            value={farmName}
            onChangeText={setFarmName}
            autoFocus
          />

          <Text className="text-moka-mid text-sm mb-2">Location</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-4"
            placeholder="Kiambu, Nakuru, ..."
            value={location}
            onChangeText={setLocation}
          />

          <Text className="text-moka-mid text-sm mb-2">Default milk price (KES per litre)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark mb-8"
            placeholder="60"
            keyboardType="decimal-pad"
            value={milkPrice}
            onChangeText={setMilkPrice}
          />

          <TouchableOpacity
            className="bg-moka-green rounded-xl py-4 items-center"
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Get Started</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
