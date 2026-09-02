import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import type { DashboardTabScreenProps } from '../navigation/types';

export default function DashboardScreen({ navigation }: DashboardTabScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddEditEntry')}>
          <Text style={styles.addButtonText}>+ Log refuel</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>KPI tiles and charts land here in Phase 3-4.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
