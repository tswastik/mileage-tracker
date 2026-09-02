import { getDatabase } from './database';
import type { FuelEntry, FuelEntryInput } from '../types/fuelEntry';

interface FuelEntryRow {
  id: number;
  date: string;
  odometer_km: number;
  liters: number;
  total_price_inr: number;
  station: string;
  notes: string;
  created_at: string;
}

function rowToFuelEntry(row: FuelEntryRow): FuelEntry {
  return {
    id: row.id,
    date: row.date,
    odometerKm: row.odometer_km,
    liters: row.liters,
    totalPriceInr: row.total_price_inr,
    station: row.station,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listAll(): Promise<FuelEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<FuelEntryRow>(
    'SELECT * FROM fuel_entries ORDER BY date ASC, created_at ASC'
  );
  return rows.map(rowToFuelEntry);
}

export async function getById(id: number): Promise<FuelEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<FuelEntryRow>(
    'SELECT * FROM fuel_entries WHERE id = ?',
    id
  );
  return row ? rowToFuelEntry(row) : null;
}

export async function create(input: FuelEntryInput): Promise<FuelEntry> {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO fuel_entries (date, odometer_km, liters, total_price_inr, station, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.date,
    input.odometerKm,
    input.liters,
    input.totalPriceInr,
    input.station,
    input.notes,
    createdAt
  );
  return {
    id: result.lastInsertRowId,
    createdAt,
    ...input,
  };
}

export async function update(id: number, input: FuelEntryInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE fuel_entries
     SET date = ?, odometer_km = ?, liters = ?, total_price_inr = ?, station = ?, notes = ?
     WHERE id = ?`,
    input.date,
    input.odometerKm,
    input.liters,
    input.totalPriceInr,
    input.station,
    input.notes,
    id
  );
}

export async function remove(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM fuel_entries WHERE id = ?', id);
}
