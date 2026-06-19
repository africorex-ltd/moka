import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/store/auth'

interface SettingItem {
  label: string
  sub: string
  icon: keyof typeof Ionicons.glyphMap
  route: string
  color?: string
}

export default function SettingsScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()

  const items: SettingItem[] = [
    { label: 'My Account', sub: 'Password, sign out', icon: 'person-circle-outline', route: '/settings/account' },
    { label: 'Farm Profile', sub: 'Farm name, location, milk price', icon: 'leaf-outline', route: '/settings/farm' },
    { label: 'Business Mode', sub: profile?.business_mode_enabled ? 'Currently ON' : 'Currently OFF', icon: 'business-outline', route: '/settings/business-mode' },
    { label: 'Sync Status', sub: 'Data sync and offline status', icon: 'cloud-outline', route: '/settings/sync' },
  ]

  const businessItems: SettingItem[] = [
    { label: 'Sales Points', sub: 'Kiosks, shops, market stalls', icon: 'storefront-outline', route: '/business/sales-point', color: '#2D5016' },
    { label: 'Milk Dispatch', sub: 'Log milk sent to sales points', icon: 'cube-outline', route: '/business/dispatch', color: '#2D5016' },
    { label: 'Team', sub: 'Employees and staff', icon: 'people-outline', route: '/business/team', color: '#2D5016' },
    { label: 'Business Costs', sub: 'Rent, salaries, expenses', icon: 'receipt-outline', route: '/business/costs', color: '#2D5016' },
  ]

  function renderItem(item: SettingItem) {
    return (
      <TouchableOpacity
        key={item.route}
        className="flex-row items-center px-5 py-4 border-b border-gray-100"
        onPress={() => router.push(item.route as never)}
      >
        <View
          className="w-9 h-9 rounded-xl items-center justify-center mr-4"
          style={{ backgroundColor: (item.color ?? '#2D5016') + '18' }}
        >
          <Ionicons name={item.icon} size={20} color={item.color ?? '#2D5016'} />
        </View>
        <View className="flex-1">
          <Text className="text-moka-dark text-sm font-semibold">{item.label}</Text>
          <Text className="text-moka-text text-xs mt-0.5">{item.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#8A9E80" />
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* User card */}
      <View className="bg-moka-green px-5 pt-14 pb-8">
        <View className="w-16 h-16 rounded-full bg-moka-light items-center justify-center mb-3">
          <Text className="text-moka-green text-2xl font-bold">
            {(profile?.full_name ?? 'F')[0].toUpperCase()}
          </Text>
        </View>
        <Text className="text-white text-xl font-bold">{profile?.full_name ?? 'Farmer'}</Text>
        <Text className="text-moka-text text-sm mt-1">{profile?.farm_name ?? ''}</Text>
        {profile?.location ? <Text className="text-moka-text text-xs mt-0.5">{profile.location}</Text> : null}
      </View>

      {/* Main settings */}
      <View className="bg-white rounded-2xl mx-4 mt-4 shadow-sm overflow-hidden">
        {items.map(renderItem)}
      </View>

      {/* Business mode section */}
      {profile?.business_mode_enabled && (
        <View className="mx-4 mt-4 shadow-sm overflow-hidden">
          <Text className="text-moka-mid text-xs font-semibold uppercase tracking-wider mb-2 px-1">Business Mode</Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            {businessItems.map(renderItem)}
          </View>
        </View>
      )}

      <View className="h-8" />
    </ScrollView>
  )
}
