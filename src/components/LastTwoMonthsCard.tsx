import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatInr, formatNum } from '../utils/format';
import { formatMonthLabel } from '../utils/dateFormat';
import { LAST_TWO_MONTHS_REFERENCE_KMPL } from '../constants/analytics';
import ChartEmptyState from './ChartEmptyState';
import type { MonthlyBreakdownEntry } from '../types/analytics';

interface Props {
  monthly: MonthlyBreakdownEntry[];
}

export default function LastTwoMonthsCard({ monthly }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Last 2 months</Text>
      {monthly.length < 2 ? (
        <ChartEmptyState message="Need at least 2 months of data." />
      ) : (
        monthly.slice(-2).map((m) => {
          const widthPct = Math.min(100, ((m.avgMileageKmpl ?? 0) / LAST_TWO_MONTHS_REFERENCE_KMPL) * 100);
          return (
            <View key={m.month} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.monthLabel}>{formatMonthLabel(m.month)}</Text>
                <Text style={styles.spend}>{formatInr(m.totalSpent)}</Text>
              </View>
              <Text style={styles.mileage}>{formatNum(m.avgMileageKmpl, ' km/L')}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${widthPct}%` }]} />
              </View>
            </View>
          );
        })
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
  row: {
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  monthLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  spend: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  mileage: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.forestGreen,
  },
});
