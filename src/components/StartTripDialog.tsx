import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { FUEL_TYPE_ICON, FUEL_TYPE_LABEL } from '../constants/fuel';
import { nowISODateTime } from '../utils/dateFormat';
import { useTrips } from '../context/TripsContext';
import DateTimeField from './DateTimeField';
import type { FuelType } from '../types/trip';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FUEL_TYPES: FuelType[] = ['petrol', 'diesel'];

export default function StartTripDialog({ visible, onClose }: Props) {
  const { startTrip } = useTrips();
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [dateTime, setDateTime] = useState(nowISODateTime());
  const [odometerKm, setOdometerKm] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFuelType('petrol');
    setDateTime(nowISODateTime());
    setOdometerKm('');
    setLocation('');
    setError(null);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleStart = async () => {
    setError(null);
    if (odometerKm.trim() === '') {
      setError('Enter the starting odometer reading.');
      return;
    }
    const odometerValue = Number(odometerKm);
    if (Number.isNaN(odometerValue)) {
      setError('Odometer must be a number.');
      return;
    }

    setSaving(true);
    try {
      await startTrip({ fuelType, dateTime, odometerKm: odometerValue, location: location.trim() });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start this trip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Start a trip</Text>

          <Text style={styles.label}>Fuel type</Text>
          <View style={styles.typeRow}>
            {FUEL_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeOption, fuelType === t && styles.typeOptionActive]}
                onPress={() => setFuelType(t)}
              >
                <Text style={styles.typeIcon}>{FUEL_TYPE_ICON[t]}</Text>
                <Text style={[styles.typeLabel, fuelType === t && styles.typeLabelActive]}>{FUEL_TYPE_LABEL[t]}</Text>
              </Pressable>
            ))}
          </View>

          <DateTimeField label="Start date & time" value={dateTime} onChange={setDateTime} />

          <Text style={styles.label}>Starting odometer (km)</Text>
          <TextInput
            style={styles.input}
            value={odometerKm}
            onChangeText={setOdometerKm}
            placeholder="e.g. 10200"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Starting location (optional)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Home"
            placeholderTextColor={colors.textMuted}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.startButton]} onPress={handleStart} disabled={saving}>
              <Text style={styles.startText}>{saving ? 'Starting…' : 'Start trip'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 44, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
  },
  typeOptionActive: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.forestGreen + '14',
  },
  typeIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  typeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  typeLabelActive: {
    color: colors.forestGreen,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  startButton: {
    backgroundColor: colors.forestGreen,
  },
  startText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.background,
  },
});
