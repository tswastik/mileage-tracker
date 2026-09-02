import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { useFuelEntries } from '../context/FuelEntriesContext';
import HistoryRow from '../components/HistoryRow';
import ConfirmDialog from '../components/ConfirmDialog';
import type { HistoryTabScreenProps } from '../navigation/types';
import type { EnrichedFuelEntry } from '../types/fuelEntry';

export default function HistoryScreen({ navigation }: HistoryTabScreenProps) {
  const { historyEntries, deleteEntry } = useFuelEntries();
  const [pendingDelete, setPendingDelete] = useState<EnrichedFuelEntry | null>(null);

  const confirmDelete = () => {
    if (pendingDelete) {
      deleteEntry(pendingDelete.id);
    }
    setPendingDelete(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddEditEntry')}>
          <Text style={styles.addButtonText}>+ Log refuel</Text>
        </Pressable>
      </View>
      <FlatList
        data={historyEntries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <HistoryRow
            entry={item}
            onEdit={() => navigation.navigate('AddEditEntry', { entryId: item.id })}
            onDelete={() => setPendingDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No refuels logged yet</Text>
            <Text style={styles.emptySubtitle}>Tap "Log refuel" to record your first fill-up.</Text>
          </View>
        }
      />
      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete this refuel?"
        message={
          pendingDelete
            ? `This will permanently remove the entry from ${pendingDelete.date}. Mileage for the next entry will be recalculated.`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.forestGreen,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.background,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
