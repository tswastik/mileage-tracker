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
// making it safe to run on every boot. Existing fuel_entries rows from
// before vehicles existed are backfilled onto a freshly-created default
// vehicle rather than lost or left dangling.
async function migrateVehicleSupport(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<TableInfoRow>('PRAGMA table_info(fuel_entries)');
  if (!columns.some((c) => c.name === 'vehicle_id')) {
    await db.execAsync('ALTER TABLE fuel_entries ADD COLUMN vehicle_id INTEGER');
  }

  const vehicleCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM vehicles');
  if (!vehicleCount || vehicleCount.count === 0) {
    await db.runAsync(
      'INSERT INTO vehicles (name, type, created_at) VALUES (?, ?, ?)',
      'My Vehicle',
      'four_wheeler',
      new Date().toISOString()
    );
  }

  const orphaned = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM fuel_entries WHERE vehicle_id IS NULL'
  );
  if (orphaned && orphaned.count > 0) {
    const firstVehicle = await db.getFirstAsync<{ id: number }>('SELECT id FROM vehicles ORDER BY id LIMIT 1');
    if (firstVehicle) {
      await db.runAsync('UPDATE fuel_entries SET vehicle_id = ? WHERE vehicle_id IS NULL', firstVehicle.id);
    }
  }
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
