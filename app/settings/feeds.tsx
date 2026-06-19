import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { generateId } from '@/lib/database'

interface FeedRow {
  local_id: string
  name: string
  category: string
  dry_matter_percent: number
  me_mj_per_kg_dm: number
  mp_g_per_kg_dm: number
  ndf_percent_dm: number
  crude_protein_percent: number
  cost_per_kg_kes: number
  is_default: number
}

const CATEGORIES = ['forage', 'concentrate', 'byproduct', 'mineral', 'other']
const CAT_COLORS: Record<string, string> = {
  forage: '#27AE60', concentrate: '#2D5016', byproduct: '#B8860B', mineral: '#8A9E80', other: '#4A5540',
}

export default function FeedsScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [feeds, setFeeds] = useState<FeedRow[]>([])
  const [showModal, setShowModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  // New feed form
  const [name, setName] = useState('')
  const [category, setCategory] = useState('concentrate')
  const [dm, setDm] = useState('')
  const [me, setMe] = useState('')
  const [mp, setMp] = useState('')
  const [ndf, setNdf] = useState('')
  const [cp, setCp] = useState('')
  const [cost, setCost] = useState('')

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<FeedRow>(
      `SELECT * FROM feed_library WHERE deleted = 0 ORDER BY is_default DESC, category, name`
    )
    setFeeds(rows)
  }, [db])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  async function handleAdd() {
    if (!name.trim()) return Alert.alert('Enter feed name')
    setSaving(true)
    await db.runAsync(
      `INSERT INTO feed_library
       (local_id, name, category, dry_matter_percent, me_mj_per_kg_dm, mp_g_per_kg_dm,
        ndf_percent_dm, crude_protein_percent, cost_per_kg_kes, is_default, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        generateId(), name.trim(), category,
        parseFloat(dm) || null,
        parseFloat(me) || null,
        parseFloat(mp) || null,
        parseFloat(ndf) || null,
        parseFloat(cp) || null,
        parseFloat(cost) || 0,
      ]
    )
    setSaving(false)
    setShowModal(false)
    setName(''); setDm(''); setMe(''); setMp(''); setNdf(''); setCp(''); setCost('')
    load()
  }

  async function updateCost(id: string, newCost: string) {
    const c = parseFloat(newCost)
    if (isNaN(c)) return
    await db.runAsync(
      `UPDATE feed_library SET cost_per_kg_kes = ?, dirty = 1, updated_at = datetime('now') WHERE local_id = ?`,
      [c, id]
    )
  }

  async function deleteFeed(id: string, isDefault: number) {
    if (isDefault) return Alert.alert('Cannot delete library feeds', 'You can only change the price of pre-loaded feeds.')
    await db.runAsync(`UPDATE feed_library SET deleted = 1, dirty = 1 WHERE local_id = ?`, [id])
    load()
  }

  const grouped = CATEGORIES.reduce<Record<string, FeedRow[]>>((acc, cat) => {
    acc[cat] = feeds.filter((f) => f.category === cat)
    return acc
  }, {})

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">My Feeds</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
      >
        <Text className="text-moka-mid text-xs px-1">
          Set your local prices. Default feeds (from SNV Feed Library) cannot be deleted.
        </Text>

        {CATEGORIES.map((cat) => {
          const catFeeds = grouped[cat]
          if (!catFeeds || catFeeds.length === 0) return null
          return (
            <View key={cat} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
                <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CAT_COLORS[cat] ?? '#8A9E80' }} />
                <Text className="text-moka-dark font-bold text-sm capitalize">{cat}</Text>
              </View>
              {catFeeds.map((feed, i) => (
                <View
                  key={feed.local_id}
                  className={`px-4 py-3 ${i < catFeeds.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-row items-center">
                    <View className="flex-1">
                      <Text className="text-moka-dark text-sm font-semibold">{feed.name}</Text>
                      <Text className="text-moka-text text-xs">
                        DM {feed.dry_matter_percent}% - ME {feed.me_mj_per_kg_dm} MJ - MP {feed.mp_g_per_kg_dm}g
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-moka-text text-xs">KES</Text>
                      <TextInput
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-moka-dark text-sm"
                        defaultValue={String(feed.cost_per_kg_kes || 0)}
                        keyboardType="decimal-pad"
                        onEndEditing={(e) => updateCost(feed.local_id, e.nativeEvent.text)}
                      />
                      {!feed.is_default && (
                        <TouchableOpacity onPress={() => deleteFeed(feed.local_id, feed.is_default)}>
                          <Ionicons name="trash-outline" size={18} color="#C0392B" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white">
          <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
            <TouchableOpacity onPress={() => setShowModal(false)} className="mr-3">
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Add Custom Feed</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View>
              <Text className="text-moka-mid text-sm mb-1">Feed name *</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark"
                placeholder="e.g. Local hay"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>
            <View>
              <Text className="text-moka-mid text-sm mb-2">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    className={`px-3 py-2 rounded-full border ${category === c ? 'bg-moka-green border-moka-green' : 'border-gray-200'}`}
                    onPress={() => setCategory(c)}
                  >
                    <Text className={`text-xs font-semibold capitalize ${category === c ? 'text-white' : 'text-moka-mid'}`}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-moka-mid text-xs mb-1">DM %</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" placeholder="e.g. 88" keyboardType="decimal-pad" value={dm} onChangeText={setDm} />
              </View>
              <View className="flex-1">
                <Text className="text-moka-mid text-xs mb-1">ME (MJ/kgDM)</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" placeholder="e.g. 12.8" keyboardType="decimal-pad" value={me} onChangeText={setMe} />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-moka-mid text-xs mb-1">MP (g/kgDM)</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" placeholder="e.g. 145" keyboardType="decimal-pad" value={mp} onChangeText={setMp} />
              </View>
              <View className="flex-1">
                <Text className="text-moka-mid text-xs mb-1">NDF (% DM)</Text>
                <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" placeholder="e.g. 22" keyboardType="decimal-pad" value={ndf} onChangeText={setNdf} />
              </View>
            </View>
            <View>
              <Text className="text-moka-mid text-sm mb-1">Cost per kg (KES)</Text>
              <TextInput className="border border-gray-200 rounded-xl px-4 py-3 text-moka-dark" placeholder="e.g. 55" keyboardType="decimal-pad" value={cost} onChangeText={setCost} />
            </View>
            <TouchableOpacity className="bg-moka-green rounded-xl py-4 items-center mt-2" onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Add Feed</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}
