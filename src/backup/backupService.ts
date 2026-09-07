import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { assertFileSystemSupported } from '../utils/platformGuards';
import type { FuelEntry, RestorePayload } from '../types/fuelEntry';
import type { Vehicle } from '../types/vehicle';

const BACKUP_VERSION = 2;

interface BackupPayloadV2 {
  version: 2;
  exportedAt: string;
  vehicles: Vehicle[];
  entries: FuelEntry[];
}

// Backups taken before multi-vehicle support existed have no `vehicles`
// array and no `vehicleId` on their entries at all.
interface BackupPayloadV1 {
  version: 1;
  exportedAt: string;
  entries: Omit<FuelEntry, 'vehicleId'>[];
}

function hasValidEntryShape(entries: unknown[]): entries is Record<string, unknown>[] {
  return entries.every(
    (e) =>
      e &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).date === 'string' &&
      typeof (e as Record<string, unknown>).odometerKm === 'number' &&
      typeof (e as Record<string, unknown>).liters === 'number' &&
      typeof (e as Record<string, unknown>).totalPriceInr === 'number'
  );
}

function isBackupPayload(value: unknown): value is BackupPayloadV1 | BackupPayloadV2 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.version !== 'number' || typeof v.exportedAt !== 'string' || !Array.isArray(v.entries)) {
    return false;
  }
  if (!hasValidEntryShape(v.entries)) return false;

  if (v.version === 1) return true;
  if (v.version === 2) {
    return (
      Array.isArray(v.vehicles) &&
      v.vehicles.every(
        (veh) =>
          veh &&
          typeof veh === 'object' &&
          typeof (veh as Record<string, unknown>).name === 'string' &&
          typeof (veh as Record<string, unknown>).type === 'string'
      )
    );
  }
  return false;
}

export async function writeAndShareBackup(vehicles: Vehicle[], entries: FuelEntry[]): Promise<void> {
  assertFileSystemSupported();
  const payload: BackupPayloadV2 = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    vehicles,
    entries,
  };

  const dir = new Directory(Paths.document, 'backups');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  const file = new File(dir, `mileage-tracker-backup-${Date.now()}.json`);
  file.write(JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Backup fuel log' });
  }
}

export async function pickAndReadBackup(): Promise<RestorePayload> {
  assertFileSystemSupported();
  const result = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (result.canceled) {
    throw new Error('No file selected.');
  }

  const text = await result.result.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!isBackupPayload(parsed)) {
    throw new Error('That file is not a valid Mileage Tracker backup.');
  }

  if (parsed.version === 1) {
    // Pre-multi-vehicle backup: every entry implicitly belonged to one
    // vehicle, which didn't exist as a concept yet — synthesize it.
    return {
      vehicles: [{ name: 'My Vehicle', type: 'four_wheeler' }],
      entries: parsed.entries.map(({ id, createdAt, ...rest }) => ({ ...rest, vehicleIndex: 0 })),
    };
  }

  const vehicleIdToIndex = new Map(parsed.vehicles.map((v, index) => [v.id, index]));
  return {
    vehicles: parsed.vehicles.map(({ id, createdAt, ...rest }) => rest),
    entries: parsed.entries.map(({ id, createdAt, vehicleId, ...rest }) => ({
      ...rest,
      vehicleIndex: vehicleIdToIndex.get(vehicleId) ?? 0,
    })),
  };
}
