import type { EnrichedFuelEntry, FuelEntry } from '../types/fuelEntry';
import type { MonthlyBreakdownEntry, SummaryStats } from '../types/analytics';
import { formatMonthLabel } from './dateFormat';

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

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

// Scope filter is applied to the already-enriched (globally chronological)
// list, so a month's first entry can still carry a valid distance computed
// against the previous month's last entry — matches the original exactly.
//
// Deliberate asymmetry preserved from the original: avgPricePerLiter uses
// ALL entries in scope (totalSpent / totalLiters), while avgMileageKmpl and
// avgCostPerKm use only the subset of entries that have a computed distance.
export function computeSummary(enriched: EnrichedFuelEntry[], month: string | null): SummaryStats {
  const scoped = month ? enriched.filter((e) => e.date.startsWith(month)) : enriched;

  const totalSpent = round2(sum(scoped.map((e) => e.totalPriceInr)));
  const totalLiters = round2(sum(scoped.map((e) => e.liters)));
  const entryCount = scoped.length;

  const withDistance = scoped.filter((e): e is EnrichedFuelEntry & { distanceKm: number } => e.distanceKm !== null);
  const totalDistanceKm = round2(sum(withDistance.map((e) => e.distanceKm)));
  const litersConsumed = round2(sum(withDistance.map((e) => e.liters)));

  const avgMileageKmpl = litersConsumed > 0 ? round2(totalDistanceKm / litersConsumed) : null;
  const avgCostPerKm =
    totalDistanceKm > 0 ? round2(sum(withDistance.map((e) => e.totalPriceInr)) / totalDistanceKm) : null;
  const avgPricePerLiter = totalLiters > 0 ? round2(totalSpent / totalLiters) : null;

  return {
    scope: month ? formatMonthLabel(month) : 'All Time',
    totalSpent,
    totalLiters,
    totalDistanceKm,
    avgMileageKmpl,
    avgCostPerKm,
    avgPricePerLiter,
    entryCount,
  };
}

function distinctMonthsAscending(entries: EnrichedFuelEntry[]): string[] {
  return Array.from(new Set(entries.map((e) => e.date.slice(0, 7)))).sort();
}

export function computeMonthlyBreakdown(enriched: EnrichedFuelEntry[]): MonthlyBreakdownEntry[] {
  return distinctMonthsAscending(enriched).map((month) => {
    const summary = computeSummary(enriched, month);
    return {
      month,
      totalSpent: summary.totalSpent,
      totalLiters: summary.totalLiters,
      totalDistanceKm: summary.totalDistanceKm,
      avgMileageKmpl: summary.avgMileageKmpl,
      avgPricePerLiter: summary.avgPricePerLiter,
      entryCount: summary.entryCount,
    };
  });
}

export function listDistinctMonthsDescending(enriched: EnrichedFuelEntry[]): string[] {
  return [...distinctMonthsAscending(enriched)].reverse();
}
