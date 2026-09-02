export interface SummaryStats {
  scope: string; // "All Time" or "YYYY-MM"
  totalSpent: number;
  totalLiters: number;
  totalDistanceKm: number;
  avgMileageKmpl: number | null;
  avgCostPerKm: number | null;
  avgPricePerLiter: number | null;
  entryCount: number;
}

export interface MonthlyBreakdownEntry {
  month: string; // YYYY-MM
  totalSpent: number;
  totalLiters: number;
  totalDistanceKm: number;
  avgMileageKmpl: number | null;
  avgPricePerLiter: number | null;
  entryCount: number;
}
