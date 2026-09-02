import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatDisplayDate, parseDateOnly, toDateOnlyString } from '../utils/dateFormat';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function DateField({ label, value, onChange }: Props) {
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(false);
    if (event.type === 'set' && selectedDate) {
      onChange(toDateOnlyString(selectedDate));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShow(true)}>
        <Text style={styles.value}>{formatDisplayDate(value)}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={parseDateOnly(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
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
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  value: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
