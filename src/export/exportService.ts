import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { assertFileSystemSupported } from '../utils/platformGuards';
import type { EnrichedFuelEntry } from '../types/fuelEntry';

const CSV_HEADERS = [
  'Date',
  'Odometer (km)',
  'Liters',
  'Total Price (INR)',
  'Price per Liter',
  'Distance (km)',
  'Mileage (km/L)',
  'Cost per km',
  'Station',
  'Notes',
];

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function buildEntriesCsv(entries: EnrichedFuelEntry[]): string {
  const rows = entries.map((e) =>
    [
      e.date,
      e.odometerKm,
      e.liters,
      e.totalPriceInr,
      e.pricePerLiter ?? '',
      e.distanceKm ?? '',
      e.mileageKmpl ?? '',
      e.costPerKm ?? '',
      e.station,
      e.notes,
    ]
      .map(csvEscape)
      .join(',')
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function exportEntriesAsCsv(entries: EnrichedFuelEntry[], vehicleName?: string): Promise<void> {
  assertFileSystemSupported();
  const csv = buildEntriesCsv(entries);
  const suffix = vehicleName ? `-${slugify(vehicleName)}` : '';
  const file = new File(Paths.cache, `mileage-tracker-export${suffix}-${Date.now()}.csv`);
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export fuel log' });
  }
}
