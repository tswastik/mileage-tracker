import { getDatabase } from './database';

const SELECTED_VEHICLE_KEY = 'selected_vehicle_id';

export async function getSelectedVehicleId(): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    SELECTED_VEHICLE_KEY
  );
  if (!row) return null;
  const id = Number(row.value);
  return Number.isNaN(id) ? null : id;
}

export async function setSelectedVehicleId(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    SELECTED_VEHICLE_KEY,
    String(id)
  );
}
