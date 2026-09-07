import React, { useState } from 'react';
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { VEHICLE_TYPE_ICON } from '../constants/vehicles';
import { useFuelEntries } from '../context/FuelEntriesContext';
import AddVehicleDialog from './AddVehicleDialog';

export default function VehicleSelector() {
  const { vehicles, selectedVehicleId, selectVehicle, addVehicle } = useFuelEntries();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {vehicles.map((vehicle) => {
          const active = vehicle.id === selectedVehicleId;
          return (
            <Pressable
              key={vehicle.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectVehicle(vehicle.id)}
            >
              <Text style={styles.chipIcon}>{VEHICLE_TYPE_ICON[vehicle.type]}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{vehicle.name}</Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.addChip} onPress={() => setShowAdd(true)}>
          <Text style={styles.addChipText}>+ Add vehicle</Text>
        </Pressable>
      </ScrollView>

      <AddVehicleDialog
        visible={showAdd}
        onCancel={() => setShowAdd(false)}
        onAdd={(input) => {
          addVehicle(input);
          setShowAdd(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.background,
  },
  addChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
  },
  addChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
});
