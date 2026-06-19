import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useSQLiteContext } from 'expo-sqlite'

export default function FarmSettingsScreen() {
  const router = useRouter()
  const db = useSQLiteContext()
  const { session, profile, setProfile } = useAuthStore()
  const [farmName, setFarmName] = useState(profile?.farm_name ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [milkPrice, setMilkPrice] = useState(String(profile?.default_milk_price ?? 60))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!farmName.trim()) return Alert.alert('Enter farm name')
    const price = parseFloat(milkPrice) || 60

    setSaving(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        farm_name: farmName.trim(),
        location: location.trim() || null,
        default_milk_price: price,
      })
      .eq('id', session!.user.id)
      .select()
      .single()

    if (error) {
      setSaving(false)
      return Alert.alert('Error', error.message)
    }

    if (data) {
      setProfile(data)
      // Update local cache
      await db.runAsync(
        `INSERT OR REPLACE INTO meta (key, value) VALUES ('cached_profile', ?)`,
        [JSON.stringify(data)]
      )
      // Update local default milk price
      await db.runAsync(
        `INSERT OR REPLACE INTO meta (key, value) VALUES ('default_milk_price', ?)`,
        [String(price)]
      )
    }
    setSaving(false)
    Alert.alert('Saved', 'Farm profile updated')
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Farm Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text className="text-moka-mid text-sm mb-1">Farm name</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            value={farmName}
            onChangeText={setFarmName}
            placeholder="My Farm"
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Location</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            value={location}
            onChangeText={setLocation}
            placeholder="County, sub-county..."
          />
        </View>

        <View>
          <Text className="text-moka-mid text-sm mb-1">Default milk price (KES per litre)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
            value={milkPrice}
            onChangeText={setMilkPrice}
            keyboardType="decimal-pad"
            placeholder="60"
          />
          <Text className="text-moka-text text-xs mt-1">Used as default when logging milk sales</Text>
        </View>

        <TouchableOpacity
          className="bg-moka-green rounded-xl py-4 items-center mt-2"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
