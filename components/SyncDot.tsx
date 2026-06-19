import { View, ActivityIndicator } from 'react-native'
import { useSyncStore } from '@/store/sync'

export default function SyncDot() {
  const { status, isSyncing } = useSyncStore()

  if (isSyncing) {
    return <ActivityIndicator size="small" color="#B8860B" />
  }

  const color =
    status === 'synced' ? '#27AE60' : status === 'offline' ? '#8A9E80' : '#E67E22'

  return (
    <View
      className="w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}
