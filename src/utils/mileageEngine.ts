import type { EnrichedFuelEntry, FuelEntry } from '../types/fuelEntry';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function chronologicalSort<T extends { date: string; createdAt: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });
}

// Ascending chronological pass, mirroring the original's mileage math exactly:
// distance/mileage/cost-per-km are null for the first entry and for any entry
// that doesn't have a valid prior odometer baseline (impossible now that create/
// edit are validated by odometerValidation, but the null-guard stays as the
// correct behavior for a fresh baseline-less first entry).
export function computeEnrichedEntries(entries: FuelEntry[]): EnrichedFuelEntry[] {
  const sorted = chronologicalSort(entries);
  let prevOdo: number | null = null;
  const enriched: EnrichedFuelEntry[] = [];

  for (const entry of sorted) {
    let distanceKm: number | null = null;
    let mileageKmpl: number | null = null;

    if (prevOdo !== null && entry.odometerKm > prevOdo) {
      distanceKm = round2(entry.odometerKm - prevOdo);
      if (entry.liters > 0) {
        mileageKmpl = round2(distanceKm / entry.liters);
      }
    }

    const pricePerLiter = entry.liters > 0 ? round2(entry.totalPriceInr / entry.liters) : null;
    const costPerKm = distanceKm && distanceKm > 0 ? round2(entry.totalPriceInr / distanceKm) : null;

    enriched.push({ ...entry, distanceKm, mileageKmpl, pricePerLiter, costPerKm });
    prevOdo = entry.odometerKm;
  }

  return enriched;
}

export function sortHistoryDescending(entries: EnrichedFuelEntry[]): EnrichedFuelEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0;
  });
}
