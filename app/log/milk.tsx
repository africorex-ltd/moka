import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSQLiteContext } from 'expo-sqlite'
import dayjs from 'dayjs'
import { generateId } from '@/lib/database'

interface Cow { local_id: string; name: string; status: string }

interface SessionEntry {
  morning: string
  midday: string
  evening: string
}

const SESSIONS = ['morning', 'midday', 'evening'] as const

export default function LogMilkScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const [cows, setCows] = useState<Cow[]>([])
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  // Map from local_id -> total litres string (daily batch mode)
  const [totals, setTotals] = useState<Record<string, string>>({})
  // Map from local_id -> expanded session detail
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sessions, setSessions] = useState<Record<string, SessionEntry>>({})
  const [qualityNotes, setQualityNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.getAllAsync<Cow>(
      `SELECT local_id, name, status FROM cows WHERE deleted = 0 AND status NOT IN ('sold','deceased') ORDER BY name`
    ).then(setCows)
  }, [db])

  // When date changes, load existing entries for that date
  const loadExisting = useCallback(async (d: string) => {
    const rows = await db.getAllAsync<{
      cow_local_id: string; session: string; quantity_litres: number; quality_notes: string | null
    }>(`SELECT cow_local_id, session, quantity_litres, quality_notes FROM milk_log WHERE date = ? AND deleted = 0`, [d])

    const newTotals: Record<string, string> = {}
    const newSessions: Record<string, SessionEntry> = {}
    const newNotes: Record<string, string> = {}

    for (const row of rows) {
      if (row.session === 'total') {
        newTotals[row.cow_local_id] = String(row.quantity_litres)
      } else {
        if (!newSessions[row.cow_local_id]) {
          newSessions[row.cow_local_id] = { morning: '', midday: '', evening: '' }
        }
        newSessions[row.cow_local_id][row.session as keyof SessionEntry] = String(row.quantity_litres)
        // If we have session entries, remove the total so UI shows session mode
        newTotals[row.cow_local_id] = ''
      }
      if (row.quality_notes) newNotes[row.cow_local_id] = row.quality_notes
    }
    setTotals(newTotals)
    setSessions(newSessions)
    setQualityNotes(newNotes)
  }, [db])

  useEffect(() => { loadExisting(date) }, [date, loadExisting])

  function toggleExpand(cowId: string) {
    setExpanded((prev) => ({ ...prev, [cowId]: !prev[cowId] }))
    if (!sessions[cowId]) {
      setSessions((prev) => ({ ...prev, [cowId]: { morning: '', midday: '', evening: '' } }))
    }
  }

  function setSessionValue(cowId: string, s: keyof SessionEntry, val: string) {
    setSessions((prev) => ({
      ...prev,
      [cowId]: { ...(prev[cowId] ?? { morning: '', midday: '', evening: '' }), [s]: val },
    }))
  }

  async function handleSave() {
    const hasAnyEntry = cows.some((c) => {
      if (expanded[c.local_id]) {
        const s = sessions[c.local_id]
        return s && (s.morning || s.midday || s.evening)
      }
      return !!totals[c.local_id]
    })

    if (!hasAnyEntry) return Alert.alert('No entries', 'Enter at least one milk quantity.')

    setSaving(true)

    // Delete existing entries for this date first (re-entry = replace)
    const cowIds = cows.map((c) => c.local_id)
    for (const cowId of cowIds) {
      await db.runAsync(
        `UPDATE milk_log SET deleted = 1, dirty = 1 WHERE cow_local_id = ? AND date = ?`,
        [cowId, date]
      )
    }

    for (const cow of cows) {
      const notes = qualityNotes[cow.local_id]?.trim() || null

      if (expanded[cow.local_id]) {
        const s = sessions[cow.local_id]
        if (!s) continue
        for (const sess of SESSIONS) {
          const val = parseFloat(s[sess])
          if (!isNaN(val) && val > 0) {
            await db.runAsync(
              `INSERT INTO milk_log (local_id, cow_local_id, date, session, quantity_litres, quality_notes, dirty)
               VALUES (?, ?, ?, ?, ?, ?, 1)`,
              [generateId(), cow.local_id, date, sess, val, notes]
            )
          }
        }
      } else {
        const val = parseFloat(totals[cow.local_id] ?? '')
        if (!isNaN(val) && val > 0) {
          await db.runAsync(
            `INSERT INTO milk_log (local_id, cow_local_id, date, session, quantity_litres, quality_notes, dirty)
             VALUES (?, ?, ?, 'total', ?, ?, 1)`,
            [generateId(), cow.local_id, date, val, notes]
          )
        }
      }
    }

    setSaving(false)
    router.back()
  }

  const totalLogged = cows.reduce((sum, c) => {
    if (expanded[c.local_id]) {
      const s = sessions[c.local_id]
      return sum + (parseFloat(s?.morning ?? '') || 0) + (parseFloat(s?.midday ?? '') || 0) + (parseFloat(s?.evening ?? '') || 0)
    }
    return sum + (parseFloat(totals[c.local_id] ?? '') || 0)
  }, 0)

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center px-4 pt-12 pb-4 bg-moka-green">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">Log Milk</Text>
          <Text className="text-moka-text text-xs">Daily totals for each cow</Text>
        </View>
        {totalLogged > 0 && (
          <View className="bg-white/20 rounded-xl px-3 py-1">
            <Text className="text-white font-bold">{totalLogged.toFixed(1)}L</Text>
          </View>
        )}
      </View>

      {/* Date picker */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => setDate(dayjs(date).subtract(1, 'day').format('YYYY-MM-DD'))}>
          <Ionicons name="chevron-back" size={20} color="#2D5016" />
        </TouchableOpacity>
        <TextInput
          className="flex-1 text-center text-moka-dark font-semibold text-base"
          value={date}
          onChangeText={setDate}
        />
        <TouchableOpacity onPress={() => setDate(dayjs(date).add(1, 'day').format('YYYY-MM-DD'))}>
          <Ionicons name="chevron-forward" size={20} color="#2D5016" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        {cows.length === 0 && (
          <View className="items-center mt-12">
            <Text className="text-moka-mid">No active cows. Add cows first.</Text>
          </View>
        )}

        {cows.map((cow) => {
          const isExpanded = expanded[cow.local_id]
          const total = totals[cow.local_id] ?? ''
          const sess = sessions[cow.local_id] ?? { morning: '', midday: '', evening: '' }
          const isDry = cow.status === 'dry'

          return (
            <View key={cow.local_id} className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <View className="flex-row items-center px-4 py-3">
                <View className="flex-1">
                  <Text className="text-moka-dark font-bold text-base">{cow.name}</Text>
                  {isDry && (
                    <Text className="text-xs font-bold" style={{ color: '#B8860B' }}>DRY</Text>
                  )}
                </View>

                {!isDry && !isExpanded && (
                  <TextInput
                    className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-center text-moka-dark font-bold text-lg mr-3"
                    placeholder="Litres"
                    keyboardType="decimal-pad"
                    value={total}
                    onChangeText={(v) => setTotals((prev) => ({ ...prev, [cow.local_id]: v }))}
                  />
                )}

                {!isDry && (
                  <TouchableOpacity onPress={() => toggleExpand(cow.local_id)} className="p-1">
                    <Ionicons
                      name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                      size={24}
                      color={isExpanded ? '#2D5016' : '#8A9E80'}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {isExpanded && !isDry && (
                <View className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <Text className="text-moka-mid text-xs mt-3 mb-2">Enter by session</Text>
                  <View className="flex-row gap-2">
                    {SESSIONS.map((s) => (
                      <View key={s} className="flex-1 items-center">
                        <Text className="text-moka-text text-xs capitalize mb-1">{s}</Text>
                        <TextInput
                          className="w-full border border-gray-200 rounded-xl px-2 py-2 text-center text-moka-dark bg-white"
                          placeholder="L"
                          keyboardType="decimal-pad"
                          value={sess[s]}
                          onChangeText={(v) => setSessionValue(cow.local_id, s, v)}
                        />
                      </View>
                    ))}
                  </View>
                  <View className="mt-3">
                    <Text className="text-moka-mid text-xs mb-1">Quality notes</Text>
                    <TextInput
                      className="border border-gray-200 rounded-xl px-3 py-2 text-moka-dark bg-white text-sm"
                      placeholder="Observations..."
                      value={qualityNotes[cow.local_id] ?? ''}
                      onChangeText={(v) => setQualityNotes((prev) => ({ ...prev, [cow.local_id]: v }))}
                    />
                  </View>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Save button */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100">
        <TouchableOpacity
          className="bg-moka-green rounded-xl py-4 items-center"
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-bold text-base">
                Save {totalLogged > 0 ? `${totalLogged.toFixed(1)}L` : 'All'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
