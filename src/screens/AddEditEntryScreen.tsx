import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { todayLocalISODate } from '../utils/dateFormat';
import { useFuelEntries } from '../context/FuelEntriesContext';
import DateField from '../components/DateField';
import type { AddEditEntryScreenProps } from '../navigation/types';

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

export default function AddEditEntryScreen({ route, navigation }: AddEditEntryScreenProps) {
  const entryId = route.params?.entryId;
  const { getEntryById, addEntry, updateEntry } = useFuelEntries();
  const existing = entryId !== undefined ? getEntryById(entryId) : undefined;

  const [date, setDate] = useState(existing?.date ?? todayLocalISODate());
  const [odometerKm, setOdometerKm] = useState(existing ? String(existing.odometerKm) : '');
  const [liters, setLiters] = useState(existing ? String(existing.liters) : '');
  const [totalPriceInr, setTotalPriceInr] = useState(existing ? String(existing.totalPriceInr) : '');
  const [station, setStation] = useState(existing?.station ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    const odometerValue = Number(odometerKm);
    const litersValue = Number(liters);
    const priceValue = Number(totalPriceInr);

    if (!date || odometerKm.trim() === '' || liters.trim() === '' || totalPriceInr.trim() === '') {
      setError('Date, odometer, liters, and price are all required.');
      return;
    }
    if (Number.isNaN(odometerValue) || Number.isNaN(litersValue) || Number.isNaN(priceValue)) {
      setError('Odometer, liters, and price must be numbers.');
      return;
    }

    const input = {
      date,
      odometerKm: odometerValue,
      liters: litersValue,
      totalPriceInr: priceValue,
      station: station.trim(),
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (existing) {
        await updateEntry(existing.id, input);
      } else {
        await addEntry(input);
      }
      navigation.goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save this entry.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DateField label="Date" value={date} onChange={setDate} />
      <FormField label="Odometer (km)" value={odometerKm} onChangeText={setOdometerKm} placeholder="e.g. 12450" />
      <FormField label="Liters" value={liters} onChangeText={setLiters} placeholder="e.g. 8.5" />
      <FormField label="Total price (₹)" value={totalPriceInr} onChangeText={setTotalPriceInr} placeholder="e.g. 850" />
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Station (optional)</Text>
        <TextInput style={styles.input} value={station} onChangeText={setStation} placeholder="e.g. Indian Oil" placeholderTextColor={colors.textMuted} />
      </View>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Anything worth remembering" placeholderTextColor={colors.textMuted} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.submitButton, saving && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitButtonText}>{saving ? 'Saving…' : existing ? 'Update' : 'Save refuel'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.forestGreen,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.background,
  },
});
