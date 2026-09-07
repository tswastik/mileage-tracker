import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { formatInr, formatNum } from '../utils/format';

interface Result {
  distanceKm: number;
  fuelNeededLiters: number;
  costInr: number;
}

function CalculatorField({
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

export default function FuelCostCalculatorScreen() {
  const [distance, setDistance] = useState('');
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    if (distance.trim() === '' || mileage.trim() === '' || price.trim() === '') {
      setError('Enter distance, mileage, and fuel price first.');
      return;
    }

    const distanceKm = Number(distance);
    const mileageKmpl = Number(mileage);
    const priceInr = Number(price);

    if (Number.isNaN(distanceKm) || Number.isNaN(mileageKmpl) || Number.isNaN(priceInr)) {
      setError('Distance, mileage, and fuel price must be numbers.');
      return;
    }
    if (distanceKm <= 0 || mileageKmpl <= 0 || priceInr <= 0) {
      setError('Distance, mileage, and fuel price must all be greater than 0.');
      return;
    }

    const fuelNeededLiters = distanceKm / mileageKmpl;
    setResult({ distanceKm, fuelNeededLiters, costInr: fuelNeededLiters * priceInr });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Fuel cost calculator</Text>
        <Text style={styles.subtitle}>
          A quick one-off estimate — not saved anywhere, not tied to a vehicle.
        </Text>

        <CalculatorField label="Total distance (km)" value={distance} onChangeText={setDistance} placeholder="e.g. 250" />
        <CalculatorField label="Mileage (km/L)" value={mileage} onChangeText={setMileage} placeholder="e.g. 18" />
        <CalculatorField label="Fuel price (₹/L)" value={price} onChangeText={setPrice} placeholder="e.g. 100" />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleCalculate}>
          <Text style={styles.buttonText}>Calculate fuel cost</Text>
        </Pressable>

        {result && (
          <View style={styles.resultCard}>
            <ResultRow label="Total trip distance" value={formatNum(result.distanceKm, ' km', 1)} />
            <ResultRow label="Fuel needed" value={formatNum(result.fuelNeededLiters, ' L')} />
            <ResultRow label="Estimated cost" value={formatInr(result.costInr)} emphasized />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, emphasized && styles.resultValueEmphasized]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
  button: {
    backgroundColor: colors.forestGreen,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.background,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resultLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  resultValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  resultValueEmphasized: {
    fontSize: 20,
    color: colors.forestGreen,
    fontFamily: fonts.headingBold,
  },
});
