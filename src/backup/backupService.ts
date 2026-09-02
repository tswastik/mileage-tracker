import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { assertFileSystemSupported } from '../utils/platformGuards';
import type { FuelEntry, FuelEntryInput } from '../types/fuelEntry';

const BACKUP_VERSION = 1;

interface BackupPayload {
  version: number;
  exportedAt: string;
  entries: FuelEntry[];
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === 'number' &&
    typeof v.exportedAt === 'string' &&
    Array.isArray(v.entries) &&
    v.entries.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        typeof (e as Record<string, unknown>).date === 'string' &&
        typeof (e as Record<string, unknown>).odometerKm === 'number' &&
        typeof (e as Record<string, unknown>).liters === 'number' &&
        typeof (e as Record<string, unknown>).totalPriceInr === 'number'
    )
  );
}

export async function writeAndShareBackup(entries: FuelEntry[]): Promise<void> {
  assertFileSystemSupported();
  const payload: BackupPayload = { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), entries };

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

export async function pickAndReadBackup(): Promise<FuelEntryInput[]> {
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

  return parsed.entries.map(({ id, createdAt, ...rest }) => rest);
}
