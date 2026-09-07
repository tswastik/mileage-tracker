import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { useFuelEntries } from '../context/FuelEntriesContext';
import AddVehicleDialog from './AddVehicleDialog';

// Shown instead of the Dashboard/History content whenever there are zero
// vehicles — a genuinely fresh install, or every vehicle having been
// deleted. No vehicle is ever auto-created on the user's behalf (see
// database.ts's migration) — this is the deliberate first step instead.
export default function EmptyVehiclesPrompt() {
  const { addVehicle } = useFuelEntries();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>🚗</Text>
      <Text style={styles.title}>Add your first vehicle</Text>
      <Text style={styles.subtitle}>
        Mileage Tracker keeps each vehicle's fuel log and mileage separate. Add a two-wheeler or
        four-wheeler to get started.
      </Text>
      <Pressable style={styles.button} onPress={() => setShowAdd(true)}>
        <Text style={styles.buttonText}>+ Add a vehicle</Text>
      </Pressable>

      <AddVehicleDialog
        visible={showAdd}
        onCancel={() => setShowAdd(false)}
        onAdd={(input) => {
          addVehicle(input);
          setShowAdd(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.forestGreen,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.background,
  },
});
