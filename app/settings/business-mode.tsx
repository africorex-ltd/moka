import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useSQLiteContext } from 'expo-sqlite'

const BUSINESS_FEATURES = [
  { icon: 'storefront-outline' as const, label: 'Sales Points', sub: 'Track kiosks, shops and market stalls' },
  { icon: 'cube-outline' as const, label: 'Milk Dispatch', sub: 'Log milk sent to each sales point' },
  { icon: 'people-outline' as const, label: 'Team Management', sub: 'Manage employees and salaries' },
  { icon: 'receipt-outline' as const, label: 'Business Costs', sub: 'Track rent, transport and overhead' },
  { icon: 'bar-chart-outline' as const, label: 'Enhanced Reports', sub: 'Full P&L with business expenses' },
]

export default function BusinessModeScreen() {
  const router = useRouter()
  const db = useSQLiteContext()
  const { session, profile, setProfile } = useAuthStore()
  const [enabled, setEnabled] = useState(profile?.business_mode_enabled ?? false)
  const [saving, setSaving] = useState(false)

  async function handleToggle(value: boolean) {
    setSaving(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({ business_mode_enabled: value })
      .eq('id', session!.user.id)
      .select()
      .single()

    if (error) {
      setSaving(false)
      return Alert.alert('Error', error.message)
    }

    if (data) {
      setProfile(data)
      await db.runAsync(
        `INSERT OR REPLACE INTO meta (key, value) VALUES ('business_mode', ?)`,
        [value ? '1' : '0']
      )
      await db.runAsync(
        `INSERT OR REPLACE INTO meta (key, value) VALUES ('cached_profile', ?)`,
        [JSON.stringify(data)]
      )
    }
    setEnabled(value)
    setSaving(false)
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Business Mode</Text>
      </View>

      {/* Toggle */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-moka-dark font-bold text-base">Enable Business Mode</Text>
            <Text className="text-moka-text text-sm mt-1">
              Unlock features for farmers who run milk sales businesses with multiple outlets and staff.
            </Text>
          </View>
          {saving ? (
            <ActivityIndicator color="#2D5016" />
          ) : (
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#D1D5DB', true: '#2D5016' }}
              thumbColor="white"
            />
          )}
        </View>
      </View>

      {/* Features list */}
      <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <Text className="text-moka-mid text-xs font-semibold uppercase tracking-wider px-5 pt-4 pb-2">
          Business Mode includes
        </Text>
        {BUSINESS_FEATURES.map((f, i) => (
          <View
            key={f.label}
            className={`flex-row items-center px-5 py-3 ${i < BUSINESS_FEATURES.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <View
              className="w-9 h-9 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: enabled ? '#2D501618' : '#F3F4F6' }}
            >
              <Ionicons name={f.icon} size={18} color={enabled ? '#2D5016' : '#9CA3AF'} />
            </View>
            <View className="flex-1">
              <Text className={`text-sm font-semibold ${enabled ? 'text-moka-dark' : 'text-gray-400'}`}>{f.label}</Text>
              <Text className={`text-xs mt-0.5 ${enabled ? 'text-moka-text' : 'text-gray-300'}`}>{f.sub}</Text>
            </View>
            {enabled && <Ionicons name="checkmark-circle" size={18} color="#27AE60" />}
          </View>
        ))}
      </View>

      <View className="h-8" />
    </ScrollView>
  )
}
