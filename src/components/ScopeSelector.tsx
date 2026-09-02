import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatMonthLabel } from '../utils/dateFormat';

interface Props {
  months: string[]; // descending YYYY-MM
  selected: string | null; // null = life-to-date
  onChange: (month: string | null) => void;
}

export default function ScopeSelector({ months, selected, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      <Chip label="All time" active={selected === null} onPress={() => onChange(null)} />
      {months.map((month) => (
        <Chip key={month} label={formatMonthLabel(month)} active={selected === month} onPress={() => onChange(month)} />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.background,
  },
});
