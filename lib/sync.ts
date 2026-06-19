import * as Network from 'expo-network'
import type { SQLiteDatabase } from 'expo-sqlite'
import { supabase } from './supabase'

const SYNC_TABLES = [
  { local: 'cows', remote: 'cows' },
  { local: 'milk_log', remote: 'milk_log' },
  { local: 'feeding_log', remote: 'feeding_log' },
  { local: 'health_log', remote: 'health_log' },
  { local: 'breeding_log', remote: 'breeding_log' },
  { local: 'calf_records', remote: 'calf_records' },
  { local: 'weight_log', remote: 'weight_log' },
  { local: 'feed_library', remote: 'feed_library' },
  { local: 'rumen_health_log', remote: 'rumen_health_log' },
  { local: 'milk_sales', remote: 'milk_sales' },
  { local: 'farm_costs', remote: 'farm_costs' },
  { local: 'sales_points', remote: 'sales_points' },
  { local: 'employees', remote: 'employees' },
  { local: 'milk_dispatch', remote: 'milk_dispatch' },
  { local: 'business_costs', remote: 'business_costs' },
]

export async function syncAll(db: SQLiteDatabase, userId: string): Promise<void> {
  const net = await Network.getNetworkStateAsync()
  if (!net.isConnected) return

  await pushDirtyRecords(db, userId)
  await pullRemoteChanges(db, userId)
  await updateLastSyncTime(db)
}

async function pushDirtyRecords(db: SQLiteDatabase, userId: string): Promise<void> {
  for (const table of SYNC_TABLES) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table.local} WHERE (dirty = 1 OR synced = 0) AND deleted = 0`
    )

    if (rows.length === 0) continue

    const payload = rows.map((row) => ({
      ...row,
      user_id: userId,
      synced: undefined,
      dirty: undefined,
      photo_uri: undefined,
    }))

    const { error } = await supabase.from(table.remote).upsert(payload, {
      onConflict: 'local_id',
      ignoreDuplicates: false,
    })

    if (!error) {
      for (const row of rows) {
        await db.runAsync(
          `UPDATE ${table.local} SET synced = 1, dirty = 0 WHERE local_id = ?`,
          [row.local_id as string]
        )
      }
    }

    // Push soft deletes
    const deleted = await db.getAllAsync<{ local_id: string }>(
      `SELECT local_id FROM ${table.local} WHERE deleted = 1 AND dirty = 1`
    )
    for (const row of deleted) {
      await supabase
        .from(table.remote)
        .update({ deleted: true })
        .eq('local_id', row.local_id)
        .eq('user_id', userId)

      await db.runAsync(
        `UPDATE ${table.local} SET dirty = 0 WHERE local_id = ?`,
        [row.local_id]
      )
    }
  }
}

async function pullRemoteChanges(db: SQLiteDatabase, userId: string): Promise<void> {
  const lastSync = await db.getFirstAsync<{ value: string | null }>(
    `SELECT value FROM meta WHERE key = 'last_synced_at'`
  )
  const since = lastSync?.value ?? '1970-01-01T00:00:00Z'

  for (const table of SYNC_TABLES) {
    let query = supabase
      .from(table.remote)
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since)

    const { data, error } = await query
    if (error || !data || data.length === 0) continue

    for (const row of data) {
      if (row.deleted) {
        await db.runAsync(
          `UPDATE ${table.local} SET deleted = 1, dirty = 0 WHERE local_id = ?`,
          [row.local_id]
        )
        continue
      }

      const existing = await db.getFirstAsync<{ local_id: string }>(
        `SELECT local_id FROM ${table.local} WHERE local_id = ?`,
        [row.local_id]
      )

      // Strip server-only fields
      const { user_id: _uid, deleted: _del, ...fields } = row

      if (existing) {
        const sets = Object.keys(fields)
          .map((k) => `${k} = ?`)
          .join(', ')
        const vals = [...Object.values(fields), row.local_id]
        await db.runAsync(
          `UPDATE ${table.local} SET ${sets}, synced = 1, dirty = 0 WHERE local_id = ?`,
          vals
        )
      } else {
        const cols = Object.keys(fields).join(', ')
        const phs = Object.keys(fields).map(() => '?').join(', ')
        await db.runAsync(
          `INSERT OR IGNORE INTO ${table.local} (${cols}, synced, dirty) VALUES (${phs}, 1, 0)`,
          Object.values(fields)
        )
      }
    }
  }
}

async function updateLastSyncTime(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString()
  await db.runAsync(
    `UPDATE meta SET value = ? WHERE key = 'last_synced_at'`,
    [now]
  )
}

export async function getLastSyncTime(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    `SELECT value FROM meta WHERE key = 'last_synced_at'`
  )
  return row?.value ?? null
}
