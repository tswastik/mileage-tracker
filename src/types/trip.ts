export type FuelType = 'petrol' | 'diesel';
export type TripStatus = 'active' | 'closed';
export type CheckpointKind = 'start' | 'waypoint' | 'end';

export interface Trip {
  id: number;
  vehicleId: number;
  fuelType: FuelType;
  status: TripStatus;
  createdAt: string;
  closedAt: string | null;
}

export interface TripCheckpoint {
  id: number;
  tripId: number;
  kind: CheckpointKind;
  dateTime: string; // ISO datetime
  odometerKm: number;
  location: string;
  liters: number | null;
  costInr: number | null;
  createdAt: string;
}

// What the start-trip form submits.
export interface StartTripInput {
  fuelType: FuelType;
  dateTime: string;
  odometerKm: number;
  location: string;
}

// What the add-waypoint / end-trip form submits.
export interface CheckpointInput {
  dateTime: string;
  odometerKm: number;
  location: string;
  liters: number | null;
  costInr: number | null;
}

export interface TripSummary {
  totalDistanceKm: number | null;
  totalLiters: number;
  totalCost: number;
  tripMileageKmpl: number | null;
  costPerKm: number | null;
  pricePerLiter: number | null;
}
