import { chronologicalSort } from './mileageEngine';
import { formatDisplayDate } from './dateFormat';
import type { FuelEntry, FuelEntryInput } from '../types/fuelEntry';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Fixes the original prototype's cascading-corruption bug: a non-increasing
// odometer reading was silently accepted and then poisoned the NEXT entry's
// distance calc as a bad baseline. Here, both create and edit are checked
// against each entry's real chronological neighbors (by date) at write time,
// so a bad reading can never be persisted or corrupt a later calculation.
// This also correctly supports backfilling a historical entry between two
// existing dates.
export function validateFuelEntryInput(
  input: FuelEntryInput,
  allEntries: FuelEntry[],
  editingId?: number
): ValidationResult {
  if (input.liters <= 0) {
    return { valid: false, error: 'Liters must be greater than 0.' };
  }
  if (input.totalPriceInr <= 0) {
    return { valid: false, error: 'Total price must be greater than 0.' };
  }
  if (input.odometerKm < 0) {
    return { valid: false, error: 'Odometer reading cannot be negative.' };
  }

  const others = allEntries.filter((e) => e.id !== editingId);
  const sorted = chronologicalSort(others);

  const prevEntry = [...sorted].reverse().find((e) => e.date <= input.date);
  const nextEntry = sorted.find((e) => e.date > input.date);

  if (prevEntry && input.odometerKm < prevEntry.odometerKm) {
    return {
      valid: false,
      error: `Odometer must be at least ${prevEntry.odometerKm} km — the reading logged on ${formatDisplayDate(
        prevEntry.date
      )}.`,
    };
  }

  if (nextEntry && input.odometerKm > nextEntry.odometerKm) {
    return {
      valid: false,
      error: `Odometer must be at most ${nextEntry.odometerKm} km — the reading logged on ${formatDisplayDate(
        nextEntry.date
      )}.`,
    };
  }

  return { valid: true };
}
