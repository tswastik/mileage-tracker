import * as SQLite from 'expo-sqlite';

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS fuel_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  odometer_km REAL NOT NULL,
  liters REAL NOT NULL,
  total_price_inr REAL NOT NULL,
  station TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_date ON fuel_entries (date, created_at);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

interface TableInfoRow {
  name: string;
}

// Additive, run-once-effectively migration for multi-vehicle support — this
// app has no versioned migration framework (see Project_Understanding.md),
// so each step checks whether it's already applied before doing anything,
// making it safe to run on every boot.
//
// A default vehicle is ONLY auto-created when there's real historical data
// that needs one — fuel_entries rows left over from before vehicles
// existed, which can't be left orphaned. A genuinely fresh install (no
// existing entries) gets NO auto-created vehicle at all; the app prompts
// the user to add their own first vehicle instead of silently naming one
// "My Vehicle" on their behalf.
async function migrateVehicleSupport(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<TableInfoRow>('PRAGMA table_info(fuel_entries)');
  if (!columns.some((c) => c.name === 'vehicle_id')) {
    await db.execAsync('ALTER TABLE fuel_entries ADD COLUMN vehicle_id INTEGER');
  }

  const orphaned = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM fuel_entries WHERE vehicle_id IS NULL'
  );
  if (!orphaned || orphaned.count === 0) {
    return;
  }

  let fallbackVehicle = await db.getFirstAsync<{ id: number }>('SELECT id FROM vehicles ORDER BY id LIMIT 1');
  if (!fallbackVehicle) {
    const result = await db.runAsync(
      'INSERT INTO vehicles (name, type, created_at) VALUES (?, ?, ?)',
      'My Vehicle',
      'four_wheeler',
      new Date().toISOString()
    );
    fallbackVehicle = { id: result.lastInsertRowId };
  }
  await db.runAsync('UPDATE fuel_entries SET vehicle_id = ? WHERE vehicle_id IS NULL', fallbackVehicle.id);
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('mileage-tracker.db').then(async (db) => {
      await db.execAsync(SCHEMA);
      await migrateVehicleSupport(db);
      return db;
    });
  }
  return dbPromise;
}
