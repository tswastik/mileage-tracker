import type { VehicleInput } from './vehicle';

export interface FuelEntry {
  id: number;
  vehicleId: number;
  date: string; // YYYY-MM-DD, local calendar date
  odometerKm: number;
  liters: number;
  totalPriceInr: number;
  station: string;
  notes: string;
  createdAt: string; // ISO timestamp
}

// What a form submits — the vehicle is never chosen per-entry, it's implied
// by whichever vehicle is currently selected, so it's not part of this type.
export type FuelEntryInput = Omit<FuelEntry, 'id' | 'createdAt' | 'vehicleId'>;

// What actually gets persisted — a FuelEntryInput stamped with the vehicle
// it belongs to.
export type FuelEntryRecord = Omit<FuelEntry, 'id' | 'createdAt'>;

export interface EnrichedFuelEntry extends FuelEntry {
  distanceKm: number | null;
  mileageKmpl: number | null;
  pricePerLiter: number | null;
  costPerKm: number | null;
}

// A validated, ready-to-persist backup: entries reference which vehicle
// they belong to by position in `vehicles`, not by any id from the backup
// file — those ids stop meaning anything once everything is recreated
// fresh on restore.
export interface RestorePayload {
  vehicles: VehicleInput[];
  entries: Array<FuelEntryInput & { vehicleIndex: number }>;
}
