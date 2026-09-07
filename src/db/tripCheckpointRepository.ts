import { getDatabase } from './database';
import type { CheckpointInput, CheckpointKind, TripCheckpoint } from '../types/trip';

interface TripCheckpointRow {
  id: number;
  trip_id: number;
  kind: string;
  date_time: string;
  odometer_km: number;
  location: string;
  liters: number | null;
  cost_inr: number | null;
  created_at: string;
}

function rowToCheckpoint(row: TripCheckpointRow): TripCheckpoint {
  return {
    id: row.id,
    tripId: row.trip_id,
    kind: row.kind as CheckpointKind,
    dateTime: row.date_time,
    odometerKm: row.odometer_km,
    location: row.location,
    liters: row.liters,
    costInr: row.cost_inr,
    createdAt: row.created_at,
  };
}

export async function listAll(): Promise<TripCheckpoint[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TripCheckpointRow>(
    'SELECT * FROM trip_checkpoints ORDER BY date_time ASC, id ASC'
  );
  return rows.map(rowToCheckpoint);
}

export async function create(tripId: number, kind: CheckpointKind, input: CheckpointInput): Promise<TripCheckpoint> {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO trip_checkpoints (trip_id, kind, date_time, odometer_km, location, liters, cost_inr, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    tripId,
    kind,
    input.dateTime,
    input.odometerKm,
    input.location,
    input.liters,
    input.costInr,
    createdAt
  );
  return {
    id: result.lastInsertRowId,
    tripId,
    kind,
    dateTime: input.dateTime,
    odometerKm: input.odometerKm,
    location: input.location,
    liters: input.liters,
    costInr: input.costInr,
    createdAt,
  };
}

export async function removeForTrip(tripId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trip_checkpoints WHERE trip_id = ?', tripId);
}
