import type { SQLiteDatabase } from 'expo-sqlite'

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function safeAddColumn(db: SQLiteDatabase, table: string, col: string, def: string) {
  try { await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`) } catch {}
}

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS cows (
      local_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tag_number TEXT,
      breed TEXT DEFAULT 'Friesian',
      date_of_birth TEXT,
      date_acquired TEXT NOT NULL DEFAULT (date('now')),
      acquisition_cost REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      sire_code TEXT,
      dam_name TEXT,
      live_weight_kg REAL,
      body_condition_score REAL,
      mature_weight_kg REAL DEFAULT 550,
      milk_fat_percent REAL DEFAULT 3.5,
      milk_protein_percent REAL DEFAULT 3.2,
      photo_uri TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milk_log (
      local_id TEXT PRIMARY KEY,
      cow_local_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      session TEXT NOT NULL DEFAULT 'total',
      quantity_litres REAL NOT NULL,
      quality_notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feeding_log (
      local_id TEXT PRIMARY KEY,
      cow_local_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      feed_type TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      cost_per_kg REAL DEFAULT 0,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_log (
      local_id TEXT PRIMARY KEY,
      cow_local_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      drug_used TEXT,
      dosage TEXT,
      vet_name TEXT,
      cost REAL DEFAULT 0,
      next_due_date TEXT,
      reminder_set INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS breeding_log (
      local_id TEXT PRIMARY KEY,
      cow_local_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      event_type TEXT NOT NULL,
      sire_code TEXT,
      bull_or_stud_details TEXT,
      expected_calving_date TEXT,
      actual_calving_date TEXT,
      pd_date TEXT,
      pd_result TEXT,
      dry_date TEXT,
      outcome TEXT,
      cost REAL DEFAULT 0,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calf_records (
      local_id TEXT PRIMARY KEY,
      name TEXT,
      gender TEXT NOT NULL DEFAULT 'heifer',
      date_of_birth TEXT NOT NULL,
      birth_body_weight_kg REAL,
      dam_cow_local_id TEXT NOT NULL,
      sire_code TEXT,
      current_weight_kg REAL,
      weight_recorded_date TEXT,
      growth_rate_per_day_kg REAL,
      weaned_date TEXT,
      weaning_weight_kg REAL,
      status TEXT NOT NULL DEFAULT 'alive',
      remarks TEXT,
      breeding_log_local_id TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weight_log (
      local_id TEXT PRIMARY KEY,
      cow_local_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      weight_kg REAL NOT NULL,
      body_condition_score REAL,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feed_library (
      local_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'concentrate',
      dry_matter_percent REAL,
      me_mj_per_kg_dm REAL,
      mp_g_per_kg_dm REAL,
      ndf_percent_dm REAL,
      crude_protein_percent REAL,
      cost_per_kg_kes REAL DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rumen_health_log (
      local_id TEXT PRIMARY KEY,
      cow_local_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      reading_time TEXT,
      rumen_ph REAL,
      rumen_temp_celsius REAL,
      rumen_motility_score INTEGER,
      activity_score INTEGER,
      sensor_type TEXT DEFAULT 'manual',
      vet_name TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milk_sales (
      local_id TEXT PRIMARY KEY,
      date TEXT NOT NULL DEFAULT (date('now')),
      buyer_name TEXT,
      quantity_litres REAL NOT NULL,
      price_per_litre REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      mpesa_reference TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS farm_costs (
      local_id TEXT PRIMARY KEY,
      cow_local_id TEXT,
      date TEXT NOT NULL DEFAULT (date('now')),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales_points (
      local_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      type TEXT DEFAULT 'kiosk',
      rent_amount REAL DEFAULT 0,
      rent_period TEXT DEFAULT 'monthly',
      rent_due_date TEXT,
      is_active INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      local_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL,
      assignment TEXT DEFAULT 'farm',
      salary_amount REAL DEFAULT 0,
      pay_period TEXT DEFAULT 'monthly',
      date_joined TEXT NOT NULL DEFAULT (date('now')),
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milk_dispatch (
      local_id TEXT PRIMARY KEY,
      date TEXT NOT NULL DEFAULT (date('now')),
      quantity_litres REAL NOT NULL,
      sales_point_local_id TEXT,
      dispatched_by TEXT,
      received_by TEXT,
      transport_type TEXT NOT NULL DEFAULT 'bodaboda',
      transport_cost REAL DEFAULT 0,
      carrier_name TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_costs (
      local_id TEXT PRIMARY KEY,
      date TEXT NOT NULL DEFAULT (date('now')),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      sales_point_local_id TEXT,
      synced INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_date TEXT NOT NULL DEFAULT (datetime('now')),
      method TEXT NOT NULL,
      record_type TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      imported_rows INTEGER DEFAULT 0,
      skipped_rows INTEGER DEFAULT 0,
      error_details TEXT
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO meta (key, value) VALUES ('last_synced_at', NULL);
    INSERT OR IGNORE INTO meta (key, value) VALUES ('default_milk_price', '60');
    INSERT OR IGNORE INTO meta (key, value) VALUES ('business_mode', '0');
    INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '0');
  `)

  await runMigrations(db)
  await seedFeedLibrary(db)
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    `SELECT value FROM meta WHERE key = 'schema_version'`
  )
  const version = parseInt(row?.value ?? '0')

  if (version < 1) {
    // Add new columns to existing cows table
    await safeAddColumn(db, 'cows', 'sire_code', 'TEXT')
    await safeAddColumn(db, 'cows', 'dam_name', 'TEXT')
    await safeAddColumn(db, 'cows', 'live_weight_kg', 'REAL')
    await safeAddColumn(db, 'cows', 'body_condition_score', 'REAL')
    await safeAddColumn(db, 'cows', 'mature_weight_kg', 'REAL DEFAULT 550')
    await safeAddColumn(db, 'cows', 'milk_fat_percent', 'REAL DEFAULT 3.5')
    await safeAddColumn(db, 'cows', 'milk_protein_percent', 'REAL DEFAULT 3.2')
    // Add new columns to breeding_log
    await safeAddColumn(db, 'breeding_log', 'sire_code', 'TEXT')
    await safeAddColumn(db, 'breeding_log', 'pd_date', 'TEXT')
    await safeAddColumn(db, 'breeding_log', 'pd_result', 'TEXT')
    await safeAddColumn(db, 'breeding_log', 'dry_date', 'TEXT')

    await db.runAsync(`UPDATE meta SET value = '1' WHERE key = 'schema_version'`)
  }
}

const SNV_FEEDS = [
  { name: 'Napier grass (fresh)', category: 'forage', dm: 18, me: 9.2, mp: 65, ndf: 68, cp: 8, cost: 2 },
  { name: 'Maize silage', category: 'forage', dm: 30, me: 10.5, mp: 72, ndf: 52, cp: 9, cost: 8 },
  { name: 'Dairy meal (16% CP)', category: 'concentrate', dm: 88, me: 12.8, mp: 145, ndf: 22, cp: 16, cost: 55 },
  { name: 'Lucerne hay', category: 'forage', dm: 88, me: 9.8, mp: 145, ndf: 40, cp: 18, cost: 40 },
  { name: 'Maize stover', category: 'forage', dm: 85, me: 7.8, mp: 38, ndf: 72, cp: 5, cost: 3 },
  { name: 'Molasses', category: 'byproduct', dm: 75, me: 11.2, mp: 28, ndf: 0, cp: 4, cost: 18 },
  { name: 'Wheat bran', category: 'byproduct', dm: 88, me: 11.8, mp: 122, ndf: 42, cp: 15, cost: 42 },
  { name: 'Cottonseed cake', category: 'concentrate', dm: 91, me: 12.2, mp: 285, ndf: 28, cp: 36, cost: 65 },
  { name: 'Sunflower cake', category: 'concentrate', dm: 91, me: 11.5, mp: 240, ndf: 38, cp: 30, cost: 58 },
  { name: 'Mineral lick (block)', category: 'mineral', dm: 99, me: 0, mp: 0, ndf: 0, cp: 0, cost: 120 },
  { name: 'Rhodes grass hay', category: 'forage', dm: 88, me: 8.5, mp: 55, ndf: 72, cp: 7, cost: 25 },
  { name: 'Maize grain (ground)', category: 'concentrate', dm: 88, me: 13.8, mp: 88, ndf: 12, cp: 11, cost: 65 },
  { name: 'Soybean meal', category: 'concentrate', dm: 88, me: 12.5, mp: 320, ndf: 12, cp: 44, cost: 120 },
  { name: 'Sugarcane tops', category: 'forage', dm: 22, me: 8.8, mp: 42, ndf: 62, cp: 5, cost: 1 },
  { name: 'Brewers grains (wet)', category: 'byproduct', dm: 22, me: 11.2, mp: 165, ndf: 52, cp: 22, cost: 12 },
]

async function seedFeedLibrary(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM feed_library WHERE is_default = 1`
  )
  if ((existing?.c ?? 0) > 0) return

  for (const f of SNV_FEEDS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO feed_library
       (local_id, name, category, dry_matter_percent, me_mj_per_kg_dm, mp_g_per_kg_dm,
        ndf_percent_dm, crude_protein_percent, cost_per_kg_kes, is_default, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [generateId(), f.name, f.category, f.dm, f.me, f.mp, f.ndf, f.cp, f.cost]
    )
  }
}
