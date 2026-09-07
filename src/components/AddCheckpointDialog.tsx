import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { nowISODateTime } from '../utils/dateFormat';
import { useTrips } from '../context/TripsContext';
import DateTimeField from './DateTimeField';

interface Props {
  visible: boolean;
  tripId: number;
  isEnding: boolean;
  onClose: () => void;
}

export default function AddCheckpointDialog({ visible, tripId, isEnding, onClose }: Props) {
  const { addCheckpoint, endTrip } = useTrips();
  const [dateTime, setDateTime] = useState(nowISODateTime());
  const [odometerKm, setOdometerKm] = useState('');
  const [location, setLocation] = useState('');
  const [liters, setLiters] = useState('');
  const [costInr, setCostInr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDateTime(nowISODateTime());
    setOdometerKm('');
    setLocation('');
    setLiters('');
    setCostInr('');
    setError(null);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (odometerKm.trim() === '') {
      setError('Enter the odometer reading.');
      return;
    }
    const odometerValue = Number(odometerKm);
    if (Number.isNaN(odometerValue)) {
      setError('Odometer must be a number.');
      return;
    }

    if (isEnding && (liters.trim() === '' || costInr.trim() === '')) {
      setError('Add the fuel used to top back up to end the trip.');
      return;
    }

    let litersValue: number | null = null;
    let costValue: number | null = null;
    if (liters.trim() !== '' || costInr.trim() !== '') {
      litersValue = Number(liters);
      costValue = Number(costInr);
      if (Number.isNaN(litersValue) || Number.isNaN(costValue)) {
        setError('Liters and cost must be numbers.');
        return;
      }
    }

    const input = {
      dateTime,
      odometerKm: odometerValue,
      location: location.trim(),
      liters: litersValue,
      costInr: costValue,
    };

    setSaving(true);
    try {
      if (isEnding) {
        await endTrip(tripId, input);
      } else {
        await addCheckpoint(tripId, input);
      }
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this stop.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>{isEnding ? 'End trip' : 'Add a stop'}</Text>
            {isEnding && (
              <Text style={styles.subtitle}>
                Top up the fuel to the same level as when you started, and record what that took.
              </Text>
            )}

            <DateTimeField label="Date & time" value={dateTime} onChange={setDateTime} />

            <Text style={styles.label}>Odometer (km)</Text>
            <TextInput
              style={styles.input}
              value={odometerKm}
              onChangeText={setOdometerKm}
              placeholder="e.g. 10450"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Location {isEnding ? '(optional)' : ''}</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. City B"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Liters {isEnding ? '' : '(optional)'}</Text>
            <TextInput
              style={styles.input}
              value={liters}
              onChangeText={setLiters}
              placeholder="e.g. 8.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Cost (₹) {isEnding ? '' : '(optional)'}</Text>
            <TextInput
              style={styles.input}
              value={costInr}
              onChangeText={setCostInr}
              placeholder="e.g. 850"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, isEnding ? styles.endButton : styles.addButton]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={styles.addText}>{saving ? 'Saving…' : isEnding ? 'End trip' : 'Add stop'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 17,
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
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  addButton: {
    backgroundColor: colors.forestGreen,
  },
  endButton: {
    backgroundColor: colors.terracotta,
  },
  addText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.background,
  },
});
