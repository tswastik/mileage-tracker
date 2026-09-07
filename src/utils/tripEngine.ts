import type { CheckpointInput, TripCheckpoint, TripSummary } from '../types/trip';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Checkpoints are append-only and recorded live (no historical backfill, unlike
// the regular fuel log) — so each new one only ever needs checking against the
// trip's own immediately-previous checkpoint, never a "next neighbor."
export function validateCheckpointInput(input: CheckpointInput, previousCheckpoint: TripCheckpoint | null): ValidationResult {
  if (input.odometerKm < 0) {
    return { valid: false, error: 'Odometer reading cannot be negative.' };
  }
  if (previousCheckpoint && input.odometerKm < previousCheckpoint.odometerKm) {
    return {
      valid: false,
      error: `Odometer must be at least ${previousCheckpoint.odometerKm} km — the reading logged at the previous stop.`,
    };
  }

  const hasLiters = input.liters !== null;
  const hasCost = input.costInr !== null;
  if (hasLiters !== hasCost) {
    return { valid: false, error: 'Enter both liters and cost, or leave both blank.' };
  }
  if (hasLiters && (input.liters as number) <= 0) {
    return { valid: false, error: 'Liters must be greater than 0.' };
  }
  if (hasCost && (input.costInr as number) <= 0) {
    return { valid: false, error: 'Cost must be greater than 0.' };
  }

  return { valid: true };
}

// Uses whichever checkpoint is most recent for "the end" of the distance
// calculation — this is deliberate: an active trip can show live
// "distance so far" using its latest waypoint, and a closed trip uses the
// exact same formula with its `end` checkpoint as the latest one. No special
// casing needed for active vs. closed.
export function computeTripSummary(checkpoints: TripCheckpoint[]): TripSummary {
  if (checkpoints.length === 0) {
    return {
      totalDistanceKm: null,
      totalLiters: 0,
      totalCost: 0,
      tripMileageKmpl: null,
      costPerKm: null,
      pricePerLiter: null,
    };
  }

  const start = checkpoints[0];
  const latest = checkpoints[checkpoints.length - 1];

  const totalDistanceKm = latest.odometerKm > start.odometerKm ? round2(latest.odometerKm - start.odometerKm) : null;
  const totalLiters = round2(checkpoints.reduce((sum, c) => sum + (c.liters ?? 0), 0));
  const totalCost = round2(checkpoints.reduce((sum, c) => sum + (c.costInr ?? 0), 0));

  const tripMileageKmpl =
    totalDistanceKm !== null && totalLiters > 0 ? round2(totalDistanceKm / totalLiters) : null;
  const costPerKm = totalDistanceKm !== null && totalDistanceKm > 0 ? round2(totalCost / totalDistanceKm) : null;
  const pricePerLiter = totalLiters > 0 ? round2(totalCost / totalLiters) : null;

  return { totalDistanceKm, totalLiters, totalCost, tripMileageKmpl, costPerKm, pricePerLiter };
}
