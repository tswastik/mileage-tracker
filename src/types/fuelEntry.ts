export interface FuelEntry {
  id: number;
  date: string; // YYYY-MM-DD, local calendar date
  odometerKm: number;
  liters: number;
  totalPriceInr: number;
  station: string;
  notes: string;
  createdAt: string; // ISO timestamp
}

export type FuelEntryInput = Omit<FuelEntry, 'id' | 'createdAt'>;

export interface EnrichedFuelEntry extends FuelEntry {
  distanceKm: number | null;
  mileageKmpl: number | null;
  pricePerLiter: number | null;
  costPerKm: number | null;
}
