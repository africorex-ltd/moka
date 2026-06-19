import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import SyncDot from '@/components/SyncDot'
import { View } from 'react-native'

type IconName = keyof typeof Ionicons.glyphMap

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Ionicons name={name} size={24} color={focused ? '#2D5016' : '#8A9E80'} />
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2D5016',
        tabBarInactiveTintColor: '#8A9E80',
        tabBarStyle: { borderTopColor: '#EAF2E3', borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: { backgroundColor: '#2D5016' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <View className="mr-4">
            <SyncDot />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="herd"
        options={{
          title: 'Herd',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'paw' : 'paw-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calves"
        options={{
          title: 'Calves',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'leaf' : 'leaf-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'clipboard' : 'clipboard-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'cash' : 'cash-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'menu' : 'menu-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  )
}
