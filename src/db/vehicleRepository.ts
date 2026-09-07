import { getDatabase } from './database';
import type { Vehicle, VehicleInput } from '../types/vehicle';

interface VehicleRow {
  id: number;
  name: string;
  type: string;
  created_at: string;
}

function rowToVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Vehicle['type'],
    createdAt: row.created_at,
  };
}

export async function listAll(): Promise<Vehicle[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<VehicleRow>('SELECT * FROM vehicles ORDER BY id ASC');
  return rows.map(rowToVehicle);
}

export async function create(input: VehicleInput): Promise<Vehicle> {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO vehicles (name, type, created_at) VALUES (?, ?, ?)',
    input.name,
    input.type,
    createdAt
  );
  return { id: result.lastInsertRowId, createdAt, ...input };
}

export async function remove(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', id);
}
