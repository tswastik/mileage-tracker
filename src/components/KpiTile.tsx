import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';

interface Props {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
}

export default function KpiTile({ label, value, icon, accentColor }: Props) {
  return (
    <View style={styles.tile}>
      <View style={[styles.iconChip, { backgroundColor: accentColor + '14' }]}>
        <Text style={[styles.icon, { color: accentColor }]}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
});
