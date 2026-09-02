import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { kpiColors } from '../constants/analytics';
import { formatInr, formatNum } from '../utils/format';
import { useFuelEntries } from '../context/FuelEntriesContext';
import KpiTile from '../components/KpiTile';
import ScopeSelector from '../components/ScopeSelector';
import type { DashboardTabScreenProps } from '../navigation/types';

export default function DashboardScreen({ navigation }: DashboardTabScreenProps) {
  const { distinctMonths, getSummary } = useFuelEntries();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const summary = useMemo(() => getSummary(selectedMonth), [getSummary, selectedMonth]);

  const tiles = [
    { label: 'Avg mileage', value: formatNum(summary.avgMileageKmpl, ' km/L'), icon: '📈', accentColor: kpiColors.mileage },
    { label: 'Total spent', value: formatInr(summary.totalSpent), icon: '💰', accentColor: kpiColors.spend },
    { label: 'Distance', value: formatNum(summary.totalDistanceKm, ' km', 1), icon: '🛣️', accentColor: kpiColors.distance },
    { label: 'Fuel used', value: formatNum(summary.totalLiters, ' L'), icon: '⛽', accentColor: kpiColors.fuelUsed },
    { label: 'Cost / km', value: formatInr(summary.avgCostPerKm), icon: '📉', accentColor: kpiColors.costPerKm },
    { label: 'Avg ₹/L', value: formatInr(summary.avgPricePerLiter), icon: '🧾', accentColor: kpiColors.avgPricePerLiter },
    { label: 'Refuels', value: String(summary.entryCount), icon: '🔁', accentColor: kpiColors.refuels },
    { label: 'Scope', value: summary.scope, icon: '🗓️', accentColor: kpiColors.scope },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddEditEntry')}>
          <Text style={styles.addButtonText}>+ Log refuel</Text>
        </Pressable>
      </View>

      <ScopeSelector months={distinctMonths} selected={selectedMonth} onChange={setSelectedMonth} />

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <KpiTile key={tile.label} {...tile} />
        ))}
      </View>

      <Text style={styles.chartsPlaceholder}>Charts land here in Phase 4.</Text>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartsPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
