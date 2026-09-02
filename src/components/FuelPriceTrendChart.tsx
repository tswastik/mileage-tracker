import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatMonthLabel } from '../utils/dateFormat';
import ChartEmptyState from './ChartEmptyState';
import type { MonthlyBreakdownEntry } from '../types/analytics';

interface Props {
  monthly: MonthlyBreakdownEntry[];
}

export default function FuelPriceTrendChart({ monthly }: Props) {
  // avgPricePerLiter is only null when a month's total liters is 0, which
  // can't happen for any month with at least one entry (liters > 0 is
  // enforced at write time) — the ?? 0 fallback is unreachable in practice,
  // matching the original, which also doesn't filter nulls for this chart.
  const points = monthly.map((m) => ({ value: m.avgPricePerLiter ?? 0, label: formatMonthLabel(m.month) }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Fuel price trend</Text>
      {monthly.length === 0 ? (
        <ChartEmptyState message="No fuel price data yet." />
      ) : (
        <LineChart
          data={points}
          curved={false}
          color={colors.terracotta}
          thickness={2}
          dataPointsColor={colors.terracotta}
          dataPointsRadius={3}
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          rulesColor={colors.border}
          noOfSections={4}
          spacing={48}
          initialSpacing={16}
          height={160}
        />
      )}
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
});
