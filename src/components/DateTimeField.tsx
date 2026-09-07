import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatDisplayDateTime, parseDateTime, toISODateTimeString } from '../utils/dateFormat';

interface Props {
  label: string;
  value: string; // full ISO datetime
  onChange: (value: string) => void;
}

// Android's native picker has no combined "datetime" mode (only 'date' or
// 'time' separately), so this chains a date picker into a time picker. iOS
// supports mode="datetime" directly, in one step.
type Step = 'none' | 'date' | 'time';

export default function DateTimeField({ label, value, onChange }: Props) {
  const [step, setStep] = useState<Step>('none');
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const handleDateChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    if (Platform.OS === 'ios') {
      setStep('none');
      onChange(toISODateTimeString(selectedDate));
      return;
    }
    setPendingDate(selectedDate);
    setStep('time');
  };

  const handleTimeChange = (_event: DateTimePickerChangeEvent, selectedTime: Date) => {
    setStep('none');
    const base = pendingDate ?? parseDateTime(value);
    const combined = new Date(base);
    combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    onChange(toISODateTimeString(combined));
    setPendingDate(null);
  };

  const handleDismiss = () => {
    setStep('none');
    setPendingDate(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setStep('date')}>
        <Text style={styles.value}>{formatDisplayDateTime(value)}</Text>
      </Pressable>
      {step === 'date' && (
        <DateTimePicker
          value={parseDateTime(value)}
          mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={handleDateChange}
          onDismiss={handleDismiss}
        />
      )}
      {step === 'time' && (
        <DateTimePicker
          value={pendingDate ?? parseDateTime(value)}
          mode="time"
          display="default"
          onValueChange={handleTimeChange}
          onDismiss={handleDismiss}
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
