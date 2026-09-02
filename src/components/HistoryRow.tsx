import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatDisplayDate } from '../utils/dateFormat';
import { formatInr, formatNum } from '../utils/format';
import type { EnrichedFuelEntry } from '../types/fuelEntry';

interface Props {
  entry: EnrichedFuelEntry;
  onEdit: () => void;
  onDelete: () => void;
}

export default function HistoryRow({ entry, onEdit, onDelete }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.mainInfo}>
        <Text style={styles.date}>{formatDisplayDate(entry.date)}</Text>
        <Text style={styles.subtitle}>
          {formatNum(entry.odometerKm, ' km', 1)} · {formatNum(entry.liters, ' L')} · {formatInr(entry.totalPriceInr)}
        </Text>
        <Text style={styles.subtitle}>
          {formatInr(entry.pricePerLiter)}/L
          {entry.distanceKm !== null ? ` · ${formatNum(entry.distanceKm, ' km', 1)}` : ''}
          {entry.station ? ` · ${entry.station}` : ''}
        </Text>
      </View>
      <View style={styles.mileageBlock}>
        <Text style={[styles.mileage, entry.mileageKmpl === null && styles.mileageMuted]}>
          {formatNum(entry.mileageKmpl, ' km/L')}
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={onEdit} hitSlop={8} style={styles.actionButton}>
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8} style={styles.actionButton}>
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  mainInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  date: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  mileageBlock: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  mileage: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.forestGreen,
  },
  mileageMuted: {
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionButton: {
    paddingVertical: 2,
  },
  actionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.blue,
  },
  deleteText: {
    color: colors.terracotta,
  },
});
