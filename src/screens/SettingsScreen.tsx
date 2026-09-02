import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { useFuelEntries } from '../context/FuelEntriesContext';
import { exportEntriesAsCsv } from '../export/exportService';
import { writeAndShareBackup, pickAndReadBackup } from '../backup/backupService';
import ConfirmDialog from '../components/ConfirmDialog';

type BusyAction = 'csv' | 'backup' | 'restore' | null;

export default function SettingsScreen() {
  const { entries, historyEntries, importBackup } = useFuelEntries();
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ count: number; run: () => Promise<void> } | null>(null);

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
      setPendingImport({
        count: imported.length,
        run: () => importBackup(imported),
      });
    });

  const confirmRestore = () => {
    const pending = pendingImport;
    setPendingImport(null);
    if (pending) {
      runAction('restore', pending.run);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Export</Text>
        <Text style={styles.sectionSubtitle}>Download your fuel log as a spreadsheet.</Text>
        <ActionButton
          label="Export as CSV"
          busy={busy === 'csv'}
          onPress={() => runAction('csv', () => exportEntriesAsCsv(historyEntries))}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Backup</Text>
        <Text style={styles.sectionSubtitle}>
          This app stores data only on this device. Back up regularly so you don't lose it on reinstall or a new
          phone.
        </Text>
        <ActionButton
          label="Backup data"
          busy={busy === 'backup'}
          onPress={() => runAction('backup', () => writeAndShareBackup(entries))}
        />
        <ActionButton label="Restore from backup" busy={busy === 'restore'} onPress={handleRestore} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Row label="App" value="Mileage Tracker" />
        <Row label="Refuels logged" value={String(entries.length)} />
      </View>

      <ConfirmDialog
        visible={pendingImport !== null}
        title="Restore from backup?"
        message={
          pendingImport
            ? `This replaces all ${entries.length} entries currently on this device with ${pendingImport.count} entries from the backup. This can't be undone.`
            : ''
        }
        confirmLabel="Restore"
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmRestore}
      />
    </ScrollView>
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
});
