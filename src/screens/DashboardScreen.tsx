import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { kpiColors } from '../constants/analytics';
import { formatInr, formatNum } from '../utils/format';
import { useFuelEntries } from '../context/FuelEntriesContext';
import KpiTile from '../components/KpiTile';
import VehicleSelector from '../components/VehicleSelector';
import EmptyVehiclesPrompt from '../components/EmptyVehiclesPrompt';
import ScopeSelector from '../components/ScopeSelector';
import MileageTrendChart from '../components/MileageTrendChart';
import LastTwoMonthsCard from '../components/LastTwoMonthsCard';
import MonthComparisonChart from '../components/MonthComparisonChart';
import FuelPriceTrendChart from '../components/FuelPriceTrendChart';
import type { DashboardTabScreenProps } from '../navigation/types';

export default function DashboardScreen({ navigation }: DashboardTabScreenProps) {
  const { vehicles, distinctMonths, getSummary, monthlyBreakdown } = useFuelEntries();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const summary = useMemo(() => getSummary(selectedMonth), [getSummary, selectedMonth]);

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>Dashboard</Text>
          <EmptyVehiclesPrompt />
        </View>
      </SafeAreaView>
    );
  }

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddEditEntry')}>
            <Text style={styles.addButtonText}>+ Log refuel</Text>
          </Pressable>
        </View>

        <VehicleSelector />

        <ScopeSelector months={distinctMonths} selected={selectedMonth} onChange={setSelectedMonth} />

        <View style={styles.grid}>
          {tiles.map((tile) => (
            <KpiTile key={tile.label} {...tile} />
          ))}
        </View>

        <MileageTrendChart monthly={monthlyBreakdown} />
        <LastTwoMonthsCard monthly={monthlyBreakdown} />
        <MonthComparisonChart monthly={monthlyBreakdown} />
        <FuelPriceTrendChart monthly={monthlyBreakdown} />
      </ScrollView>
    </SafeAreaView>
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
});
