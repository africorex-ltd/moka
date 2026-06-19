import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSQLiteContext } from 'expo-sqlite'
import dayjs from 'dayjs'
import {
  calculateRequirements, formulateRation,
  type CowNutritionProfile, type FeedItem, type DailyRequirements, type RationResult,
} from '@/lib/rationCalculator'

interface CowData {
  local_id: string
  name: string
  live_weight_kg: number | null
  body_condition_score: number | null
  milk_fat_percent: number | null
  milk_protein_percent: number | null
  date_of_birth: string | null
}

interface FeedLibraryRow {
  local_id: string
  name: string
  category: string
  dry_matter_percent: number
  me_mj_per_kg_dm: number
  mp_g_per_kg_dm: number
  ndf_percent_dm: number
  cost_per_kg_kes: number
}

export default function RationScreen() {
  const { cowId } = useLocalSearchParams<{ cowId: string }>()
  const db = useSQLiteContext()
  const router = useRouter()

  const [cow, setCow] = useState<CowData | null>(null)
  const [todayYield, setTodayYield] = useState(0)
  const [lactationWeek, setLactationWeek] = useState(0)
  const [feedLibrary, setFeedLibrary] = useState<FeedLibraryRow[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [requirements, setRequirements] = useState<DailyRequirements | null>(null)
  const [result, setResult] = useState<RationResult | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const cowRow = await db.getFirstAsync<CowData>(`SELECT * FROM cows WHERE local_id = ?`, [cowId])
    if (!cowRow) { setLoading(false); return }
    setCow(cowRow)

    // Get yesterday's yield
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
    const yieldRow = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(quantity_litres), 0) as total FROM milk_log WHERE cow_local_id = ? AND date = ? AND deleted = 0`,
      [cowId, yesterday]
    )
    const yld = yieldRow?.total ?? 0
    setTodayYield(yld)

    // Get calving date to compute lactation week
    const calvingRow = await db.getFirstAsync<{ actual_calving_date: string }>(
      `SELECT actual_calving_date FROM breeding_log WHERE cow_local_id = ? AND event_type = 'calved' AND actual_calving_date IS NOT NULL ORDER BY actual_calving_date DESC LIMIT 1`,
      [cowId]
    )
    const week = calvingRow?.actual_calving_date
      ? dayjs().diff(dayjs(calvingRow.actual_calving_date), 'week')
      : 0
    setLactationWeek(week)

    // Calculate requirements
    const profile: CowNutritionProfile = {
      liveWeightKg: cowRow.live_weight_kg ?? 450,
      milkYieldLitresPerDay: yld || 10,
      milkFatPercent: cowRow.milk_fat_percent ?? 3.5,
      milkProteinPercent: cowRow.milk_protein_percent ?? 3.2,
      lactationWeekNumber: week,
      bodyConditionScore: cowRow.body_condition_score ?? 3.0,
      isPregnant: false,
    }
    setRequirements(calculateRequirements(profile))

    // Load feed library
    const feeds = await db.getAllAsync<FeedLibraryRow>(
      `SELECT * FROM feed_library WHERE deleted = 0 ORDER BY category, name`
    )
    setFeedLibrary(feeds)
    setLoading(false)
  }, [db, cowId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function recalculate() {
    if (!requirements) return
    const feedItems: FeedItem[] = feedLibrary.map((f) => ({
      ...f,
      quantity_kg_as_fed: parseFloat(quantities[f.local_id] ?? '0') || 0,
    }))
    setResult(formulateRation(requirements, feedItems))
  }

  async function saveAsFeedingPlan() {
    if (!result || !cow) return
    const today = dayjs().format('YYYY-MM-DD')
    let saved = 0
    for (const alloc of result.allocations) {
      if (alloc.feed.quantity_kg_as_fed <= 0) continue
      await db.runAsync(
        `INSERT OR REPLACE INTO feeding_log
         (local_id, cow_local_id, date, feed_type, quantity_kg, cost_per_kg, dirty)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          `ration_${cowId}_${today}_${alloc.feed.local_id}`,
          cowId, today,
          alloc.feed.name,
          alloc.feed.quantity_kg_as_fed,
          alloc.feed.cost_per_kg_kes,
        ]
      )
      saved++
    }
    Alert.alert('Feeding plan saved', `${saved} feed entries added to today's feeding log.`)
    router.back()
  }

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2D5016" /></View>
  if (!cow) return <View className="flex-1 items-center justify-center"><Text className="text-moka-mid">Cow not found</Text></View>

  const balanceColor = (bal: number) => bal >= 0 ? '#27AE60' : '#C0392B'

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-moka-green px-4 pt-12 pb-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">Ration - {cow.name}</Text>
        </View>
        <View className="flex-row gap-4">
          <View>
            <Text className="text-moka-text text-xs">Yesterday yield</Text>
            <Text className="text-white text-lg font-bold">{todayYield.toFixed(1)} L</Text>
          </View>
          <View>
            <Text className="text-moka-text text-xs">Live weight</Text>
            <Text className="text-white text-lg font-bold">{cow.live_weight_kg ?? '?'} kg</Text>
          </View>
          <View>
            <Text className="text-moka-text text-xs">Lactation week</Text>
            <Text className="text-white text-lg font-bold">{lactationWeek}</Text>
          </View>
        </View>
      </View>

      <View className="px-4 mt-4 gap-4">

        {/* Daily requirements */}
        {requirements && (
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-moka-dark font-bold text-sm mb-3">Daily Requirements</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 items-center bg-moka-light rounded-xl p-3">
                <Text className="text-moka-text text-xs">Energy (ME)</Text>
                <Text className="text-moka-dark font-bold">{requirements.meMjPerDay} MJ</Text>
              </View>
              <View className="flex-1 items-center bg-moka-light rounded-xl p-3">
                <Text className="text-moka-text text-xs">Protein (MP)</Text>
                <Text className="text-moka-dark font-bold">{requirements.mpGPerDay} g</Text>
              </View>
              <View className="flex-1 items-center bg-moka-light rounded-xl p-3">
                <Text className="text-moka-text text-xs">Est. DMI</Text>
                <Text className="text-moka-dark font-bold">{requirements.dmIntakeKgPerDay} kg</Text>
              </View>
              <View className="flex-1 items-center bg-moka-light rounded-xl p-3">
                <Text className="text-moka-text text-xs">Min NDF</Text>
                <Text className="text-moka-dark font-bold">{requirements.ndfMinPercent}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Feed entries */}
        <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Text className="text-moka-dark font-bold text-sm">Your Feeds (kg as fed)</Text>
            <TouchableOpacity onPress={() => router.push('/settings/feeds' as never)}>
              <Text className="text-moka-green text-xs font-semibold">Manage feeds</Text>
            </TouchableOpacity>
          </View>
          {feedLibrary.map((feed, i) => (
            <View
              key={feed.local_id}
              className={`flex-row items-center px-4 py-3 ${i < feedLibrary.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <View className="flex-1">
                <Text className="text-moka-dark text-sm font-semibold">{feed.name}</Text>
                <Text className="text-moka-text text-xs">
                  {feed.me_mj_per_kg_dm} MJ/kgDM - {feed.mp_g_per_kg_dm}g MP - KES {feed.cost_per_kg_kes}/kg
                </Text>
              </View>
              <TextInput
                className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-center text-moka-dark"
                placeholder="0"
                keyboardType="decimal-pad"
                value={quantities[feed.local_id] ?? ''}
                onChangeText={(v) => setQuantities((prev) => ({ ...prev, [feed.local_id]: v }))}
              />
            </View>
          ))}
          {feedLibrary.length === 0 && (
            <View className="py-8 items-center">
              <Text className="text-moka-text text-sm">No feeds in library.</Text>
              <TouchableOpacity className="mt-2" onPress={() => router.push('/settings/feeds' as never)}>
                <Text className="text-moka-green text-sm font-semibold">Set up feeds</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          className="bg-moka-gold rounded-xl py-3 items-center"
          onPress={recalculate}
        >
          <Text className="text-white font-bold">Analyse Ration</Text>
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <>
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-moka-dark font-bold text-sm mb-3">Ration Analysis</Text>
              <View className="gap-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-moka-text text-sm">Total energy</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-moka-dark font-semibold">{result.totalMeMj} MJ</Text>
                    <Text className="text-xs font-semibold" style={{ color: balanceColor(result.meBalance) }}>
                      ({result.meBalance >= 0 ? '+' : ''}{result.meBalance} MJ)
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-moka-text text-sm">Total protein</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-moka-dark font-semibold">{result.totalMpG} g</Text>
                    <Text className="text-xs font-semibold" style={{ color: balanceColor(result.mpBalance) }}>
                      ({result.mpBalance >= 0 ? '+' : ''}{result.mpBalance} g)
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-moka-text text-sm">Fibre (NDF)</Text>
                  <Text className={`font-semibold ${result.totalNdfPercent >= 32 ? 'text-moka-success' : 'text-moka-danger'}`}>
                    {result.totalNdfPercent}% {result.totalNdfPercent >= 32 ? '(OK)' : '(LOW)'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center border-t border-gray-100 pt-2 mt-1">
                  <Text className="text-moka-text text-sm">Daily feed cost</Text>
                  <Text className="text-moka-dark font-bold">KES {result.totalCostKes.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-moka-text text-sm">Cost per litre</Text>
                  <Text className="text-moka-dark font-semibold">KES {result.costPerLitre.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {result.warnings.length > 0 && (
              <View className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="warning-outline" size={18} color="#E67E22" />
                  <Text className="text-orange-700 font-bold text-sm">Warnings</Text>
                </View>
                {result.warnings.map((w, i) => (
                  <Text key={i} className="text-orange-700 text-sm mt-1">{w}</Text>
                ))}
              </View>
            )}

            {result.warnings.length === 0 && (
              <View className="bg-green-50 rounded-2xl p-4 border border-green-200">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="checkmark-circle-outline" size={18} color="#27AE60" />
                  <Text className="text-green-700 font-semibold text-sm">Ration is well balanced</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              className="bg-moka-green rounded-xl py-4 items-center"
              onPress={saveAsFeedingPlan}
            >
              <Text className="text-white font-bold text-base">Save as Today's Feeding Plan</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
      <View className="h-8" />
    </ScrollView>
  )
}
