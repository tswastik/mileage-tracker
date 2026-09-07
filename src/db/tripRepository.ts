import { getDatabase } from './database';
import type { FuelType, Trip, TripStatus } from '../types/trip';

interface TripRow {
  id: number;
  vehicle_id: number;
  fuel_type: string;
  status: string;
  created_at: string;
  closed_at: string | null;
}

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    fuelType: row.fuel_type as FuelType,
    status: row.status as TripStatus,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}

export async function listAll(): Promise<Trip[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TripRow>('SELECT * FROM trips ORDER BY created_at ASC');
  return rows.map(rowToTrip);
}

export async function create(vehicleId: number, fuelType: FuelType): Promise<Trip> {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO trips (vehicle_id, fuel_type, status, created_at, closed_at) VALUES (?, ?, ?, ?, ?)',
    vehicleId,
    fuelType,
    'active',
    createdAt,
    null
  );
  return { id: result.lastInsertRowId, vehicleId, fuelType, status: 'active', createdAt, closedAt: null };
}

export async function close(id: number): Promise<string> {
  const db = await getDatabase();
  const closedAt = new Date().toISOString();
  await db.runAsync('UPDATE trips SET status = ?, closed_at = ? WHERE id = ?', 'closed', closedAt, id);
  return closedAt;
}

export async function remove(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trips WHERE id = ?', id);
}
