import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { kpiColors } from '../constants/analytics';
import { FUEL_TYPE_ICON, FUEL_TYPE_LABEL } from '../constants/fuel';
import { formatDisplayDateTime } from '../utils/dateFormat';
import { formatInr, formatNum } from '../utils/format';
import { useTrips } from '../context/TripsContext';
import KpiTile from '../components/KpiTile';
import AddCheckpointDialog from '../components/AddCheckpointDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import type { TripDetailScreenProps } from '../navigation/types';
import type { CheckpointKind, TripCheckpoint } from '../types/trip';

const KIND_LABEL: Record<CheckpointKind, string> = {
  start: 'Start',
  waypoint: 'Stop',
  end: 'End',
};

export default function TripDetailScreen({ route, navigation }: TripDetailScreenProps) {
  const { tripId } = route.params;
  const { vehicleTrips, getCheckpoints, getSummary, cancelTrip } = useTrips();
  const [showAddStop, setShowAddStop] = useState(false);
  const [showEndTrip, setShowEndTrip] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trip = vehicleTrips.find((t) => t.id === tripId);
  const checkpoints = getCheckpoints(tripId);
  const summary = getSummary(tripId);

  if (!trip) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>This trip isn't available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = trip.status === 'active';
  const canCancel = isActive && checkpoints.length <= 1;

  const tiles = [
    { label: 'Distance', value: formatNum(summary.totalDistanceKm, ' km', 1), icon: '🛣️', accentColor: kpiColors.distance },
    { label: 'Trip mileage', value: formatNum(summary.tripMileageKmpl, ' km/L'), icon: '📈', accentColor: kpiColors.mileage },
    { label: 'Total fuel', value: formatNum(summary.totalLiters, ' L'), icon: '⛽', accentColor: kpiColors.fuelUsed },
    { label: 'Total cost', value: formatInr(summary.totalCost), icon: '💰', accentColor: kpiColors.spend },
    { label: 'Cost / km', value: formatInr(summary.costPerKm), icon: '📉', accentColor: kpiColors.costPerKm },
    { label: 'Avg ₹/L', value: formatInr(summary.pricePerLiter), icon: '🧾', accentColor: kpiColors.avgPricePerLiter },
  ];

  const handleCancelTrip = async () => {
    setError(null);
    try {
      await cancelTrip(tripId);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel this trip.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.fuelBadge}>
            {FUEL_TYPE_ICON[trip.fuelType]} {FUEL_TYPE_LABEL[trip.fuelType]}
          </Text>
          <Text style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusClosed]}>
            {isActive ? 'Active' : 'Closed'}
          </Text>
        </View>

        <View style={styles.grid}>
          {tiles.map((tile) => (
            <KpiTile key={tile.label} {...tile} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Stops</Text>
        <View style={styles.card}>
          {checkpoints.map((checkpoint, index) => (
            <CheckpointRow key={checkpoint.id} checkpoint={checkpoint} isLast={index === checkpoints.length - 1} />
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {isActive && (
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.addStopButton]} onPress={() => setShowAddStop(true)}>
              <Text style={styles.addStopText}>+ Add a stop</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.endButton]} onPress={() => setShowEndTrip(true)}>
              <Text style={styles.endText}>End trip</Text>
            </Pressable>
            {canCancel && (
              <Pressable style={styles.cancelLink} onPress={() => setShowCancelConfirm(true)}>
                <Text style={styles.cancelLinkText}>Cancel this trip</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <AddCheckpointDialog visible={showAddStop} tripId={tripId} isEnding={false} onClose={() => setShowAddStop(false)} />
      <AddCheckpointDialog visible={showEndTrip} tripId={tripId} isEnding={true} onClose={() => setShowEndTrip(false)} />
      <ConfirmDialog
        visible={showCancelConfirm}
        title="Cancel this trip?"
        message="This removes the trip and its start marker. It can't be undone."
        confirmLabel="Cancel trip"
        onCancel={() => setShowCancelConfirm(false)}
        onConfirm={() => {
          setShowCancelConfirm(false);
          handleCancelTrip();
        }}
      />
    </SafeAreaView>
  );
}

function CheckpointRow({ checkpoint, isLast }: { checkpoint: TripCheckpoint; isLast: boolean }) {
  return (
    <View style={[rowStyles.row, isLast && rowStyles.rowLast]}>
      <View style={rowStyles.main}>
        <Text style={rowStyles.kind}>{KIND_LABEL[checkpoint.kind]}</Text>
        <Text style={rowStyles.dateTime}>{formatDisplayDateTime(checkpoint.dateTime)}</Text>
        {checkpoint.location !== '' && <Text style={rowStyles.location}>{checkpoint.location}</Text>}
      </View>
      <View style={rowStyles.side}>
        <Text style={rowStyles.odometer}>{formatNum(checkpoint.odometerKm, ' km', 1)}</Text>
        {checkpoint.liters !== null && (
          <Text style={rowStyles.fuel}>
            {formatNum(checkpoint.liters, ' L')} · {formatInr(checkpoint.costInr)}
          </Text>
        )}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  main: {
    flex: 1,
    paddingRight: spacing.md,
  },
  kind: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  dateTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  location: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  side: {
    alignItems: 'flex-end',
  },
  odometer: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  fuel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.forestGreen,
    marginTop: 2,
  },
});

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  fuelBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  statusBadge: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  statusActive: {
    backgroundColor: colors.forestGreen + '14',
    color: colors.forestGreen,
  },
  statusClosed: {
    backgroundColor: colors.border,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addStopButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.forestGreen,
  },
  addStopText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.forestGreen,
  },
  endButton: {
    backgroundColor: colors.terracotta,
  },
  endText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.background,
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelLinkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
});
