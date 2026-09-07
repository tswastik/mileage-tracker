import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { VEHICLE_TYPE_ICON } from '../constants/vehicles';
import { useFuelEntries } from '../context/FuelEntriesContext';
import { exportEntriesAsCsv } from '../export/exportService';
import { writeAndShareBackup, pickAndReadBackup } from '../backup/backupService';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Vehicle } from '../types/vehicle';
import type { RestorePayload } from '../types/fuelEntry';

type BusyAction = 'csv' | 'backup' | 'restore' | null;

export default function SettingsScreen() {
  const { vehicles, entries, historyEntries, selectedVehicle, importBackup, deleteVehicle } = useFuelEntries();
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<RestorePayload | null>(null);
  const [pendingDeleteVehicle, setPendingDeleteVehicle] = useState<Vehicle | null>(null);

  const runAction = async (action: BusyAction, fn: () => Promise<void>) => {
    setError(null);
    setBusy(action);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = () =>
    runAction('restore', async () => {
      const imported = await pickAndReadBackup();
      setPendingImport(imported);
    });

  const confirmRestore = () => {
    const pending = pendingImport;
    setPendingImport(null);
    if (pending) {
      runAction('restore', () => importBackup(pending));
    }
  };

  const confirmDeleteVehicle = () => {
    const vehicle = pendingDeleteVehicle;
    setPendingDeleteVehicle(null);
    if (vehicle) {
      runAction(null, () => deleteVehicle(vehicle.id));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicles</Text>
          <Text style={styles.sectionSubtitle}>A vehicle can only be deleted once it has no logged entries.</Text>
          {vehicles.map((vehicle) => {
            const count = entries.filter((e) => e.vehicleId === vehicle.id).length;
            return (
              <View key={vehicle.id} style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>
                  {VEHICLE_TYPE_ICON[vehicle.type]} {vehicle.name}
                </Text>
                {count > 0 ? (
                  <Text style={styles.vehicleCount}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
                ) : (
                  <Pressable onPress={() => setPendingDeleteVehicle(vehicle)}>
                    <Text style={styles.deleteLink}>Delete</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Export</Text>
          <Text style={styles.sectionSubtitle}>
            Download {selectedVehicle ? `${selectedVehicle.name}'s` : 'the current vehicle\'s'} fuel log as a
            spreadsheet.
          </Text>
          <ActionButton
            label="Export as CSV"
            busy={busy === 'csv'}
            onPress={() => runAction('csv', () => exportEntriesAsCsv(historyEntries, selectedVehicle?.name))}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Backup</Text>
          <Text style={styles.sectionSubtitle}>
            This app stores data only on this device. Back up regularly so you don't lose it on reinstall or a new
            phone. Backup and restore cover every vehicle, not just the selected one.
          </Text>
          <ActionButton
            label="Backup data"
            busy={busy === 'backup'}
            onPress={() => runAction('backup', () => writeAndShareBackup(vehicles, entries))}
          />
          <ActionButton label="Restore from backup" busy={busy === 'restore'} onPress={handleRestore} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>
          <Row label="App" value="Mileage Tracker" />
          <Row label="Vehicles" value={String(vehicles.length)} />
          <Row label="Refuels logged" value={String(entries.length)} />
        </View>

        <ConfirmDialog
          visible={pendingImport !== null}
          title="Restore from backup?"
          message={
            pendingImport
              ? `This replaces all ${vehicles.length} vehicle(s) and ${entries.length} entries currently on this device with ${pendingImport.vehicles.length} vehicle(s) and ${pendingImport.entries.length} entries from the backup. This can't be undone.`
              : ''
          }
          confirmLabel="Restore"
          onCancel={() => setPendingImport(null)}
          onConfirm={confirmRestore}
        />

        <ConfirmDialog
          visible={pendingDeleteVehicle !== null}
          title="Delete this vehicle?"
          message={pendingDeleteVehicle ? `This removes "${pendingDeleteVehicle.name}" from your vehicle list.` : ''}
          onCancel={() => setPendingDeleteVehicle(null)}
          onConfirm={confirmDeleteVehicle}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color={colors.forestGreen} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  button: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.forestGreen,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  rowValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vehicleLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  vehicleCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  deleteLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.terracotta,
  },
});
