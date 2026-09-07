import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { VEHICLE_TYPE_ICON, VEHICLE_TYPE_LABEL } from '../constants/vehicles';
import type { VehicleInput, VehicleType } from '../types/vehicle';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onAdd: (input: VehicleInput) => void;
}

const TYPES: VehicleType[] = ['two_wheeler', 'four_wheeler'];

export default function AddVehicleDialog({ visible, onCancel, onAdd }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleType>('two_wheeler');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (name.trim() === '') {
      setError('Give this vehicle a name.');
      return;
    }
    onAdd({ name: name.trim(), type });
    setName('');
    setType('two_wheeler');
    setError(null);
  };

  const handleCancel = () => {
    setName('');
    setType('two_wheeler');
    setError(null);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Add a vehicle</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Activa"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeOption, type === t && styles.typeOptionActive]}
                onPress={() => setType(t)}
              >
                <Text style={styles.typeIcon}>{VEHICLE_TYPE_ICON[t]}</Text>
                <Text style={[styles.typeLabel, type === t && styles.typeLabelActive]}>{VEHICLE_TYPE_LABEL[t]}</Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.addButton]} onPress={handleAdd}>
              <Text style={styles.addText}>Add</Text>
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
    maxWidth: 360,
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
    marginBottom: spacing.sm,
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
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
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
  addText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.background,
  },
});
