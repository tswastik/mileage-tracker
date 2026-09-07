import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { parseDateTime, toISODateTimeString } from '../utils/dateFormat';

interface Props {
  label: string;
  value: string; // full ISO datetime
  onChange: (value: string) => void;
}

export default function DateTimeField({ label, value, onChange }: Props) {
  // datetime-local's value/onChange use a timezone-less "YYYY-MM-DDTHH:mm"
  // wall-clock string; parsing it with new Date(year, month, day, ...) (not
  // new Date(theString)) interprets it as local time, matching the native
  // picker's behavior, before converting to a real ISO instant.
  const localValue = format(parseDateTime(value), "yyyy-MM-dd'T'HH:mm");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [datePart, timePart] = e.target.value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    onChange(toISODateTimeString(new Date(year, month - 1, day, hour, minute)));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="datetime-local"
        value={localValue}
        onChange={handleChange}
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
