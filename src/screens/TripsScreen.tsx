import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { FUEL_TYPE_ICON } from '../constants/fuel';
import { formatDisplayDateTime } from '../utils/dateFormat';
import { formatInr, formatNum } from '../utils/format';
import { useFuelEntries } from '../context/FuelEntriesContext';
import { useTrips } from '../context/TripsContext';
import VehicleSelector from '../components/VehicleSelector';
import EmptyVehiclesPrompt from '../components/EmptyVehiclesPrompt';
import StartTripDialog from '../components/StartTripDialog';
import type { TripsTabScreenProps } from '../navigation/types';
import type { Trip, TripCheckpoint, TripSummary } from '../types/trip';

export default function TripsScreen({ navigation }: TripsTabScreenProps) {
  const { vehicles } = useFuelEntries();
  const { activeTrip, closedTrips, getCheckpoints, getSummary } = useTrips();
  const [showStart, setShowStart] = useState(false);

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>Trips</Text>
          <EmptyVehiclesPrompt />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Trips</Text>

        <VehicleSelector />

        {activeTrip ? (
          <ActiveTripCard
            trip={activeTrip}
            checkpoints={getCheckpoints(activeTrip.id)}
            summary={getSummary(activeTrip.id)}
            onPress={() => navigation.navigate('TripDetail', { tripId: activeTrip.id })}
          />
        ) : (
          <Pressable style={styles.startButton} onPress={() => setShowStart(true)}>
            <Text style={styles.startButtonText}>+ Start a trip</Text>
          </Pressable>
        )}

        {closedTrips.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past trips</Text>
            {closedTrips.map((trip) => (
              <ClosedTripRow
                key={trip.id}
                trip={trip}
                checkpoints={getCheckpoints(trip.id)}
                summary={getSummary(trip.id)}
                onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
              />
            ))}
          </>
        )}

        {!activeTrip && closedTrips.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Start a trip to track its own distance, mileage, and cost.</Text>
          </View>
        )}
      </ScrollView>

      <StartTripDialog visible={showStart} onClose={() => setShowStart(false)} />
    </SafeAreaView>
  );
}

function ActiveTripCard({
  trip,
  checkpoints,
  summary,
  onPress,
}: {
  trip: Trip;
  checkpoints: TripCheckpoint[];
  summary: TripSummary;
  onPress: () => void;
}) {
  const start = checkpoints[0];
  return (
    <Pressable style={styles.activeCard} onPress={onPress}>
      <View style={styles.activeHeader}>
        <Text style={styles.activeLabel}>{FUEL_TYPE_ICON[trip.fuelType]} Active trip</Text>
        <Text style={styles.activeSince}>since {start ? formatDisplayDateTime(start.dateTime) : ''}</Text>
      </View>
      <View style={styles.activeStatsRow}>
        <Text style={styles.activeStat}>
          {checkpoints.length} stop{checkpoints.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.activeStat}>{formatNum(summary.totalDistanceKm, ' km so far', 1)}</Text>
      </View>
      <Text style={styles.activeCta}>Manage trip →</Text>
    </Pressable>
  );
}

function ClosedTripRow({
  trip,
  checkpoints,
  summary,
  onPress,
}: {
  trip: Trip;
  checkpoints: TripCheckpoint[];
  summary: TripSummary;
  onPress: () => void;
}) {
  const start = checkpoints[0];
  const end = checkpoints[checkpoints.length - 1];
  return (
    <Pressable style={styles.tripRow} onPress={onPress}>
      <View style={styles.tripRowMain}>
        <Text style={styles.tripDate}>
          {start ? formatDisplayDateTime(start.dateTime) : ''} — {end ? formatDisplayDateTime(end.dateTime) : ''}
        </Text>
        <Text style={styles.tripSub}>
          {formatNum(summary.totalDistanceKm, ' km', 1)} · {formatInr(summary.totalCost)}
        </Text>
      </View>
      <Text style={styles.tripMileage}>{formatNum(summary.tripMileageKmpl, ' km/L')}</Text>
    </Pressable>
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
    marginBottom: spacing.lg,
  },
  startButton: {
    backgroundColor: colors.forestGreen,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  startButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.background,
  },
  activeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.forestGreen,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.forestGreen,
  },
  activeSince: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  activeStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  activeStat: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  activeCta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.forestGreen,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tripRowMain: {
    flex: 1,
    paddingRight: spacing.md,
  },
  tripDate: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  tripSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  tripMileage: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.forestGreen,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
