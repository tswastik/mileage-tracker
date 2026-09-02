import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatMonthLabel } from '../utils/dateFormat';
import ChartEmptyState from './ChartEmptyState';
import type { MonthlyBreakdownEntry } from '../types/analytics';

interface Props {
  monthly: MonthlyBreakdownEntry[];
}

export default function MonthComparisonChart({ monthly }: Props) {
  const barData = monthly.flatMap((m) => [
    { value: m.totalSpent, frontColor: colors.terracotta, spacing: 2 },
    {
      value: m.totalDistanceKm,
      frontColor: colors.blue,
      label: formatMonthLabel(m.month),
      labelWidth: 56,
      labelTextStyle: { color: colors.textMuted, fontSize: 10 },
      spacing: 20,
    },
  ]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Spend & distance by month</Text>
      {monthly.length === 0 ? (
        <ChartEmptyState message="No monthly data yet." />
      ) : (
        <>
          <BarChart
            data={barData}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            noOfSections={4}
            barBorderRadius={2}
            height={180}
            initialSpacing={12}
          />
          <View style={styles.legend}>
            <LegendItem color={colors.terracotta} label="Spent (₹)" />
            <LegendItem color={colors.blue} label="Distance (km)" />
          </View>
        </>
      )}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
