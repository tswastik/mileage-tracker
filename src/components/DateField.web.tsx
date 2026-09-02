import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function DateField({ label, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.sm,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          fontFamily: fonts.body,
          fontSize: 15,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
});
