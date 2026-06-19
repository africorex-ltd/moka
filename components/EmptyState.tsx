import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  icon?: keyof typeof Ionicons.glyphMap
  message: string
  sub?: string
}

export default function EmptyState({ icon = 'leaf-outline', message, sub }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <Ionicons name={icon} size={48} color="#8A9E80" />
      <Text className="text-moka-mid text-base font-semibold mt-4 text-center">{message}</Text>
      {sub ? <Text className="text-moka-text text-sm mt-1 text-center">{sub}</Text> : null}
    </View>
  )
}
