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

export default function MileageTrendChart({ monthly }: Props) {
  // Omitting null-mileage months (rather than plotting them as 0) makes the
  // line connect straight across the gap between the nearest valid points —
  // the same visual "bridging" the original achieved with connectNulls.
  const points = monthly
    .filter((m) => m.avgMileageKmpl !== null)
    .map((m) => ({ value: m.avgMileageKmpl as number, label: formatMonthLabel(m.month) }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Monthly mileage trend</Text>
      {points.length === 0 ? (
        <ChartEmptyState message="Add at least 2 refuels to see your mileage trend." />
      ) : (
        <LineChart
          data={points}
          areaChart
          curved
          color={colors.forestGreen}
          thickness={2}
          dataPointsColor={colors.forestGreen}
          startFillColor={colors.forestGreen}
          startOpacity={0.35}
          endFillColor={colors.forestGreen}
          endOpacity={0.02}
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          rulesColor={colors.border}
          noOfSections={4}
          spacing={48}
          initialSpacing={16}
          height={180}
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
