import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions, ActivityIndicator } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { BarChart, LineChart } from 'react-native-gifted-charts'
import dayjs from 'dayjs'
import { Ionicons } from '@expo/vector-icons'

const SW = Dimensions.get('window').width - 80

type ReportTab = 'milk' | 'pl' | 'herd'

export default function ReportsScreen() {
  const db = useSQLiteContext()
  const [tab, setTab] = useState<ReportTab>('milk')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 300))
    setRefreshing(false)
  }, [])

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5016" />}
    >
      {/* Tab selector */}
      <View className="flex-row mx-4 mt-4 bg-moka-light rounded-xl p-1 gap-1">
        {([
          { key: 'milk', label: 'Milk Board' },
          { key: 'pl', label: 'P&L' },
          { key: 'herd', label: 'Herd' },
        ] as { key: ReportTab; label: string }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            className={`flex-1 py-2 rounded-lg items-center ${tab === t.key ? 'bg-moka-green' : ''}`}
            onPress={() => setTab(t.key)}
          >
            <Text className={`text-xs font-semibold ${tab === t.key ? 'text-white' : 'text-moka-mid'}`}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'milk' && <MilkProductionBoard db={db} />}
      {tab === 'pl' && <PLReport db={db} />}
      {tab === 'herd' && <HerdSummary db={db} />}
    </ScrollView>
  )
}

// -------------------- MILK PRODUCTION BOARD --------------------
function MilkProductionBoard({ db }: { db: ReturnType<typeof useSQLiteContext> }) {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState<Record<string, Record<string, number>>>({})
  const [cows, setCows] = useState<{ local_id: string; name: string; status: string }[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (m: string) => {
    setLoading(true)
    const start = dayjs(m).startOf('month').format('YYYY-MM-DD')
    const end = dayjs(m).endOf('month').format('YYYY-MM-DD')

    const cowList = await db.getAllAsync<{ local_id: string; name: string; status: string }>(
      `SELECT local_id, name, status FROM cows WHERE deleted = 0 ORDER BY name`
    )
    setCows(cowList)

    const rows = await db.getAllAsync<{ cow_local_id: string; date: string; total: number }>(
      `SELECT cow_local_id, date, COALESCE(SUM(quantity_litres), 0) as total
       FROM milk_log WHERE date BETWEEN ? AND ? AND deleted = 0
       GROUP BY cow_local_id, date`,
      [start, end]
    )

    const grid: Record<string, Record<string, number>> = {}
    for (const row of rows) {
      if (!grid[row.date]) grid[row.date] = {}
      grid[row.date][row.cow_local_id] = row.total
    }
    setData(grid)
    setLoading(false)
  }, [db])

  useEffect(() => { load(month) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const changeMonth = (delta: number) => {
    const m = dayjs(month).add(delta, 'month').format('YYYY-MM')
    setMonth(m)
    load(m)
  }

  const daysInMonth = dayjs(month).daysInMonth()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Daily totals
  const dayTotals = days.map((d) => {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    return cows.reduce((s, c) => s + (data[dateStr]?.[c.local_id] ?? 0), 0)
  })

  // Cow monthly totals
  const cowTotals = cows.reduce<Record<string, number>>((acc, c) => {
    acc[c.local_id] = days.reduce((s, d) => {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      return s + (data[dateStr]?.[c.local_id] ?? 0)
    }, 0)
    return acc
  }, {})

  const grandTotal = days.reduce((s, _, i) => s + dayTotals[i], 0)

  return (
    <View className="mx-4 mt-4 mb-6">
      {/* Month nav */}
      <View className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm">
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Ionicons name="chevron-back" size={22} color="#2D5016" />
        </TouchableOpacity>
        <Text className="text-moka-dark font-bold text-base">{dayjs(month).format('MMMM YYYY')}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={22} color="#2D5016" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="py-12 items-center"><ActivityIndicator color="#2D5016" /></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Header row */}
            <View className="flex-row">
              <View style={{ width: 36 }} className="bg-moka-green h-10 justify-center items-center rounded-tl-xl">
                <Text className="text-white text-xs font-bold">Day</Text>
              </View>
              {cows.map((c) => (
                <View key={c.local_id} style={{ width: 64 }} className="bg-moka-green h-10 justify-center items-center px-1">
                  <Text className="text-white text-xs font-bold text-center" numberOfLines={1}>{c.name}</Text>
                </View>
              ))}
              <View style={{ width: 56 }} className="bg-moka-dark h-10 justify-center items-center rounded-tr-xl">
                <Text className="text-white text-xs font-bold">Total</Text>
              </View>
            </View>

            {/* Data rows */}
            {days.map((d) => {
              const dateStr = `${month}-${String(d).padStart(2, '0')}`
              const isToday = dateStr === dayjs().format('YYYY-MM-DD')
              return (
                <View key={d} className={`flex-row ${d % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <View style={{ width: 36 }} className={`h-9 justify-center items-center ${isToday ? 'bg-moka-light' : ''}`}>
                    <Text className={`text-xs font-semibold ${isToday ? 'text-moka-green' : 'text-moka-mid'}`}>{d}</Text>
                  </View>
                  {cows.map((c) => {
                    const val = data[dateStr]?.[c.local_id]
                    const isDry = c.status === 'dry'
                    return (
                      <View key={c.local_id} style={{ width: 64 }} className="h-9 justify-center items-center">
                        {isDry && !val ? (
                          <Text style={{ color: '#B8860B', fontSize: 10, fontWeight: '700' }}>DRY</Text>
                        ) : val ? (
                          <Text className="text-moka-dark text-xs">{val % 1 === 0 ? val : val.toFixed(1)}</Text>
                        ) : (
                          <Text className="text-gray-300 text-xs">-</Text>
                        )}
                      </View>
                    )
                  })}
                  <View style={{ width: 56 }} className="h-9 justify-center items-center bg-gray-100">
                    <Text className="text-moka-dark text-xs font-semibold">
                      {dayTotals[d - 1] > 0 ? dayTotals[d - 1].toFixed(1) : '-'}
                    </Text>
                  </View>
                </View>
              )
            })}

            {/* Totals row */}
            <View className="flex-row">
              <View style={{ width: 36 }} className="bg-moka-dark h-10 justify-center items-center rounded-bl-xl">
                <Text className="text-white text-xs font-bold">TOT</Text>
              </View>
              {cows.map((c) => (
                <View key={c.local_id} style={{ width: 64 }} className="bg-moka-dark h-10 justify-center items-center">
                  <Text className="text-white text-xs font-semibold">
                    {cowTotals[c.local_id] > 0 ? cowTotals[c.local_id].toFixed(0) : '0'}
                  </Text>
                </View>
              ))}
              <View style={{ width: 56, backgroundColor: '#1A3009' }} className="h-10 justify-center items-center rounded-br-xl">
                <Text className="text-white text-xs font-bold">{grandTotal.toFixed(0)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <View className="mt-3 flex-row gap-4 bg-white rounded-xl p-3 shadow-sm">
        <View className="flex-1 items-center">
          <Text className="text-moka-text text-xs">Total litres</Text>
          <Text className="text-moka-dark font-bold text-lg">{grandTotal.toFixed(1)}</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-moka-text text-xs">Avg/day</Text>
          <Text className="text-moka-dark font-bold text-lg">{(grandTotal / Math.max(days.length, 1)).toFixed(1)}</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-moka-text text-xs">Avg/cow</Text>
          <Text className="text-moka-dark font-bold text-lg">{cows.length > 0 ? (grandTotal / cows.length / Math.max(days.length, 1)).toFixed(1) : '0'}</Text>
        </View>
      </View>
    </View>
  )
}

// -------------------- P&L REPORT --------------------
function PLReport({ db }: { db: ReturnType<typeof useSQLiteContext> }) {
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [monthlyPL, setMonthlyPL] = useState<{ month: string; revenue: number; costs: number; profit: number }[]>([])
  const [totals, setTotals] = useState({ revenue: 0, costs: 0, litres: 0 })
  const [dailyMilk, setDailyMilk] = useState<{ value: number; label: string }[]>([])

  const load = useCallback(async () => {
    const today = dayjs()
    const months = period === 'month' ? 1 : 6
    const plData: { month: string; revenue: number; costs: number; profit: number }[] = []

    for (let i = months - 1; i >= 0; i--) {
      const m = today.subtract(i, 'month')
      const start = m.startOf('month').format('YYYY-MM-DD')
      const end = m.endOf('month').format('YYYY-MM-DD')
      const [rev, feedCost, healthCost, farmCost] = await Promise.all([
        db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_litres * price_per_litre), 0) as v FROM milk_sales WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
        db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_kg * cost_per_kg), 0) as v FROM feeding_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
        db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(cost), 0) as v FROM health_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
        db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(amount), 0) as v FROM farm_costs WHERE date BETWEEN ? AND ? AND deleted = 0`, [start, end]),
      ])
      const revenue = rev?.v ?? 0
      const costs = (feedCost?.v ?? 0) + (healthCost?.v ?? 0) + (farmCost?.v ?? 0)
      plData.push({ month: m.format('MMM'), revenue, costs, profit: revenue - costs })
    }
    setMonthlyPL(plData)

    const milkRows = await db.getAllAsync<{ date: string; total: number }>(
      `SELECT date, COALESCE(SUM(quantity_litres), 0) as total FROM milk_log WHERE date >= ? AND deleted = 0 GROUP BY date ORDER BY date ASC`,
      [today.subtract(13, 'day').format('YYYY-MM-DD')]
    )
    const milkMap = new Map(milkRows.map((r) => [r.date, r.total]))
    setDailyMilk(Array.from({ length: 14 }, (_, i) => {
      const d = today.subtract(13 - i, 'day')
      return { value: milkMap.get(d.format('YYYY-MM-DD')) ?? 0, label: i % 3 === 0 ? d.format('D') : '' }
    }))

    const monthStart = today.startOf('month').format('YYYY-MM-DD')
    const monthEnd = today.endOf('month').format('YYYY-MM-DD')
    const [mRev, mFeed, mHealth, mFarm, mLitres] = await Promise.all([
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_litres * price_per_litre), 0) as v FROM milk_sales WHERE date BETWEEN ? AND ? AND deleted = 0`, [monthStart, monthEnd]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_kg * cost_per_kg), 0) as v FROM feeding_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [monthStart, monthEnd]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(cost), 0) as v FROM health_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [monthStart, monthEnd]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(amount), 0) as v FROM farm_costs WHERE date BETWEEN ? AND ? AND deleted = 0`, [monthStart, monthEnd]),
      db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_litres), 0) as v FROM milk_log WHERE date BETWEEN ? AND ? AND deleted = 0`, [monthStart, monthEnd]),
    ])
    setTotals({ revenue: mRev?.v ?? 0, costs: (mFeed?.v ?? 0) + (mHealth?.v ?? 0) + (mFarm?.v ?? 0), litres: mLitres?.v ?? 0 })
  }, [db, period])

  useEffect(() => { load() }, [load])

  const profit = totals.revenue - totals.costs
  const barData = monthlyPL.flatMap((m) => [
    { value: m.revenue, label: m.month, frontColor: '#2D5016', spacing: 4 },
    { value: m.costs, frontColor: '#B8860B', spacing: 16 },
  ])

  return (
    <View className="px-4 mt-4 gap-4 mb-6">
      <View className="bg-moka-green rounded-2xl p-4">
        <Text className="text-moka-text text-xs">{dayjs().format('MMMM YYYY')} P&L</Text>
        <View className="flex-row mt-2 gap-4">
          <View className="flex-1">
            <Text className="text-moka-text text-xs">Revenue</Text>
            <Text className="text-white text-lg font-bold">KES {totals.revenue.toLocaleString()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-moka-text text-xs">Costs</Text>
            <Text className="text-white text-lg font-bold">KES {totals.costs.toLocaleString()}</Text>
          </View>
        </View>
        <View className="mt-3 pt-3 border-t border-moka-mid">
          <Text className="text-moka-text text-xs">Net profit</Text>
          <Text className="text-xl font-bold" style={{ color: profit >= 0 ? '#EAF2E3' : '#FCA5A5' }}>
            {profit >= 0 ? '+' : ''}KES {profit.toLocaleString()}
          </Text>
          <Text className="text-moka-text text-xs mt-1">{totals.litres.toFixed(1)} litres produced</Text>
        </View>
      </View>

      <View className="flex-row bg-moka-light rounded-xl p-1">
        {(['month', 'year'] as const).map((p) => (
          <TouchableOpacity key={p} className={`flex-1 py-2 rounded-lg items-center ${period === p ? 'bg-moka-green' : ''}`} onPress={() => setPeriod(p)}>
            <Text className={`text-sm font-semibold ${period === p ? 'text-white' : 'text-moka-mid'}`}>
              {p === 'month' ? 'This month' : 'Last 6 months'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {monthlyPL.length > 0 && (
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-moka-dark font-bold text-sm mb-3">Revenue vs Costs</Text>
          <BarChart
            data={barData}
            barWidth={18}
            spacing={2}
            roundedTop
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#8A9E80', fontSize: 10 }}
            noOfSections={4}
            maxValue={Math.max(...monthlyPL.flatMap((m) => [m.revenue, m.costs])) * 1.2 || 1000}
            width={SW}
          />
        </View>
      )}

      {dailyMilk.length > 0 && (
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-moka-dark font-bold text-sm mb-3">Milk production (14 days)</Text>
          <LineChart
            data={dailyMilk}
            height={160}
            spacing={SW / 14}
            color="#2D5016"
            thickness={2}
            startFillColor="#EAF2E3"
            endFillColor="#FFFFFF"
            startOpacity={0.4}
            endOpacity={0.05}
            areaChart
            curved
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#8A9E80', fontSize: 10 }}
            dataPointsColor="#2D5016"
            dataPointsRadius={3}
            noOfSections={4}
            width={SW}
          />
        </View>
      )}
    </View>
  )
}

// -------------------- HERD SUMMARY --------------------
function HerdSummary({ db }: { db: ReturnType<typeof useSQLiteContext> }) {
  const [rows, setRows] = useState<{
    local_id: string; name: string; status: string; breed: string;
    date_of_birth: string | null; calves: number; month_litres: number; avg_per_day: number
  }[]>([])

  useEffect(() => {
    async function loadHerd() {
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD')
    const daysInMonth = dayjs().daysInMonth()

    const cows = await db.getAllAsync<{ local_id: string; name: string; status: string; breed: string; date_of_birth: string | null }>(
      `SELECT local_id, name, status, breed, date_of_birth FROM cows WHERE deleted = 0 ORDER BY name`
    )

    const result = await Promise.all(cows.map(async (c) => {
      const [litresRow, calvesRow] = await Promise.all([
        db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(quantity_litres), 0) as v FROM milk_log WHERE cow_local_id = ? AND date BETWEEN ? AND ? AND deleted = 0`, [c.local_id, monthStart, monthEnd]),
        db.getFirstAsync<{ v: number }>(`SELECT COUNT(*) as v FROM calf_records WHERE dam_cow_local_id = ? AND deleted = 0`, [c.local_id]),
      ])
      const litres = litresRow?.v ?? 0
      return { ...c, calves: calvesRow?.v ?? 0, month_litres: litres, avg_per_day: litres / daysInMonth }
    }))
    setRows(result)
    }
    loadHerd()
  }, [db])

  const ageYears = (dob: string | null) => {
    if (!dob) return '-'
    const y = dayjs().diff(dayjs(dob), 'year')
    const m = dayjs().diff(dayjs(dob), 'month') % 12
    return y > 0 ? `${y}yr ${m}mo` : `${m}mo`
  }

  const STATUS_COLORS: Record<string, string> = { active: '#27AE60', dry: '#B8860B', pregnant: '#9B59B6', sold: '#8A9E80', deceased: '#4A5540' }

  return (
    <View className="px-4 mt-4 mb-6 gap-3">
      {rows.map((cow) => (
        <View key={cow.local_id} className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-moka-dark font-bold text-base">{cow.name}</Text>
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: (STATUS_COLORS[cow.status] ?? '#8A9E80') + '20' }}>
                  <Text className="text-xs font-semibold capitalize" style={{ color: STATUS_COLORS[cow.status] ?? '#8A9E80' }}>{cow.status}</Text>
                </View>
              </View>
              <Text className="text-moka-text text-xs">{cow.breed} - {ageYears(cow.date_of_birth)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-moka-dark font-bold text-base">{cow.month_litres.toFixed(1)}L</Text>
              <Text className="text-moka-text text-xs">this month</Text>
            </View>
          </View>
          <View className="flex-row mt-3 gap-4 border-t border-gray-100 pt-3">
            <View>
              <Text className="text-moka-text text-xs">Avg/day</Text>
              <Text className="text-moka-dark font-semibold text-sm">{cow.avg_per_day.toFixed(1)}L</Text>
            </View>
            <View>
              <Text className="text-moka-text text-xs">Calves born</Text>
              <Text className="text-moka-dark font-semibold text-sm">{cow.calves}</Text>
            </View>
          </View>
        </View>
      ))}
      {rows.length === 0 && (
        <View className="items-center py-12">
          <Ionicons name="analytics-outline" size={48} color="#8A9E80" />
          <Text className="text-moka-mid mt-3">No cows yet</Text>
        </View>
      )}
    </View>
  )
}
