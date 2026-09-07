import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import * as tripRepository from '../db/tripRepository';
import * as tripCheckpointRepository from '../db/tripCheckpointRepository';
import { computeTripSummary, validateCheckpointInput } from '../utils/tripEngine';
import { useFuelEntries } from './FuelEntriesContext';
import type { CheckpointInput, StartTripInput, Trip, TripCheckpoint, TripSummary } from '../types/trip';

interface State {
  trips: Trip[];
  checkpoints: TripCheckpoint[]; // every trip's, across every vehicle
  loading: boolean;
}

type Action =
  | { type: 'LOADED'; trips: Trip[]; checkpoints: TripCheckpoint[] }
  | { type: 'TRIP_STARTED'; trip: Trip; checkpoint: TripCheckpoint }
  | { type: 'CHECKPOINT_ADDED'; checkpoint: TripCheckpoint }
  | { type: 'TRIP_CLOSED'; tripId: number; checkpoint: TripCheckpoint; closedAt: string }
  | { type: 'TRIP_CANCELED'; tripId: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return { trips: action.trips, checkpoints: action.checkpoints, loading: false };
    case 'TRIP_STARTED':
      return {
        ...state,
        trips: [...state.trips, action.trip],
        checkpoints: [...state.checkpoints, action.checkpoint],
      };
    case 'CHECKPOINT_ADDED':
      return { ...state, checkpoints: [...state.checkpoints, action.checkpoint] };
    case 'TRIP_CLOSED':
      return {
        ...state,
        trips: state.trips.map((t) =>
          t.id === action.tripId ? { ...t, status: 'closed', closedAt: action.closedAt } : t
        ),
        checkpoints: [...state.checkpoints, action.checkpoint],
      };
    case 'TRIP_CANCELED':
      return {
        ...state,
        trips: state.trips.filter((t) => t.id !== action.tripId),
        checkpoints: state.checkpoints.filter((c) => c.tripId !== action.tripId),
      };
    default:
      return state;
  }
}

interface TripsContextValue {
  loading: boolean;
  vehicleTrips: Trip[];
  activeTrip: Trip | undefined;
  closedTrips: Trip[];
  getCheckpoints: (tripId: number) => TripCheckpoint[];
  getSummary: (tripId: number) => TripSummary;
  startTrip: (input: StartTripInput) => Promise<void>;
  addCheckpoint: (tripId: number, input: CheckpointInput) => Promise<void>;
  endTrip: (tripId: number, input: CheckpointInput) => Promise<void>;
  cancelTrip: (tripId: number) => Promise<void>;
}

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: { children: React.ReactNode }) {
  const { selectedVehicleId } = useFuelEntries();
  const [state, dispatch] = useReducer(reducer, { trips: [], checkpoints: [], loading: true });

  useEffect(() => {
    Promise.all([tripRepository.listAll(), tripCheckpointRepository.listAll()]).then(([trips, checkpoints]) =>
      dispatch({ type: 'LOADED', trips, checkpoints })
    );
  }, []);

  const getCheckpoints = useCallback(
    (tripId: number) => state.checkpoints.filter((c) => c.tripId === tripId),
    [state.checkpoints]
  );

  const getSummary = useCallback((tripId: number) => computeTripSummary(getCheckpoints(tripId)), [getCheckpoints]);

  const vehicleTrips = useMemo(
    () => state.trips.filter((t) => t.vehicleId === selectedVehicleId),
    [state.trips, selectedVehicleId]
  );
  const activeTrip = useMemo(() => vehicleTrips.find((t) => t.status === 'active'), [vehicleTrips]);
  const closedTrips = useMemo(
    () =>
      vehicleTrips
        .filter((t) => t.status === 'closed')
        .sort((a, b) => (a.closedAt && b.closedAt ? (a.closedAt < b.closedAt ? 1 : -1) : 0)),
    [vehicleTrips]
  );

  const startTrip = useCallback(
    async (input: StartTripInput) => {
      if (selectedVehicleId === null) {
        throw new Error('Add a vehicle before starting a trip.');
      }
      if (activeTrip) {
        throw new Error('End the current trip before starting a new one.');
      }
      if (input.odometerKm < 0) {
        throw new Error('Odometer reading cannot be negative.');
      }
      const trip = await tripRepository.create(selectedVehicleId, input.fuelType);
      const checkpoint = await tripCheckpointRepository.create(trip.id, 'start', {
        dateTime: input.dateTime,
        odometerKm: input.odometerKm,
        location: input.location,
        liters: null,
        costInr: null,
      });
      dispatch({ type: 'TRIP_STARTED', trip, checkpoint });
    },
    [selectedVehicleId, activeTrip]
  );

  const addCheckpoint = useCallback(
    async (tripId: number, input: CheckpointInput) => {
      const existing = getCheckpoints(tripId);
      const result = validateCheckpointInput(input, existing[existing.length - 1] ?? null);
      if (!result.valid) {
        throw new Error(result.error);
      }
      const checkpoint = await tripCheckpointRepository.create(tripId, 'waypoint', input);
      dispatch({ type: 'CHECKPOINT_ADDED', checkpoint });
    },
    [getCheckpoints]
  );

  const endTrip = useCallback(
    async (tripId: number, input: CheckpointInput) => {
      if (input.liters === null || input.costInr === null) {
        throw new Error('Add the fuel used to top back up before ending the trip.');
      }
      const existing = getCheckpoints(tripId);
      const result = validateCheckpointInput(input, existing[existing.length - 1] ?? null);
      if (!result.valid) {
        throw new Error(result.error);
      }
      const checkpoint = await tripCheckpointRepository.create(tripId, 'end', input);
      const closedAt = await tripRepository.close(tripId);
      dispatch({ type: 'TRIP_CLOSED', tripId, checkpoint, closedAt });
    },
    [getCheckpoints]
  );

  const cancelTrip = useCallback(
    async (tripId: number) => {
      const existing = getCheckpoints(tripId);
      if (existing.length > 1) {
        throw new Error("This trip already has stops recorded and can't be canceled — end it instead.");
      }
      await tripCheckpointRepository.removeForTrip(tripId);
      await tripRepository.remove(tripId);
      dispatch({ type: 'TRIP_CANCELED', tripId });
    },
    [getCheckpoints]
  );

  const value = useMemo<TripsContextValue>(
    () => ({
      loading: state.loading,
      vehicleTrips,
      activeTrip,
      closedTrips,
      getCheckpoints,
      getSummary,
      startTrip,
      addCheckpoint,
      endTrip,
      cancelTrip,
    }),
    [state.loading, vehicleTrips, activeTrip, closedTrips, getCheckpoints, getSummary, startTrip, addCheckpoint, endTrip, cancelTrip]
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return ctx;
}
