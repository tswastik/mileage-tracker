import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import * as fuelEntryRepository from '../db/fuelEntryRepository';
import * as vehicleRepository from '../db/vehicleRepository';
import * as settingsRepository from '../db/settingsRepository';
import {
  computeEnrichedEntries,
  computeMonthlyBreakdown,
  computeSummary,
  listDistinctMonthsDescending,
  sortHistoryDescending,
} from '../utils/mileageEngine';
import { validateFuelEntryInput } from '../utils/odometerValidation';
import type { EnrichedFuelEntry, FuelEntry, FuelEntryInput, FuelEntryRecord, RestorePayload } from '../types/fuelEntry';
import type { MonthlyBreakdownEntry, SummaryStats } from '../types/analytics';
import type { Vehicle, VehicleInput } from '../types/vehicle';

interface State {
  vehicles: Vehicle[];
  entries: FuelEntry[]; // every vehicle's entries
  selectedVehicleId: number | null;
  loading: boolean;
}

type Action =
  | { type: 'LOADED' | 'RESTORED'; vehicles: Vehicle[]; entries: FuelEntry[]; selectedVehicleId: number | null }
  | { type: 'ENTRY_ADDED'; entry: FuelEntry }
  | { type: 'ENTRY_UPDATED'; entry: FuelEntry }
  | { type: 'ENTRY_REMOVED'; id: number }
  | { type: 'VEHICLE_ADDED'; vehicle: Vehicle }
  | { type: 'VEHICLE_REMOVED'; id: number; fallbackSelectedId: number | null }
  | { type: 'VEHICLE_SELECTED'; id: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
    case 'RESTORED':
      return {
        vehicles: action.vehicles,
        entries: action.entries,
        selectedVehicleId: action.selectedVehicleId,
        loading: false,
      };
    case 'ENTRY_ADDED':
      return { ...state, entries: [...state.entries, action.entry] };
    case 'ENTRY_UPDATED':
      return { ...state, entries: state.entries.map((e) => (e.id === action.entry.id ? action.entry : e)) };
    case 'ENTRY_REMOVED':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case 'VEHICLE_ADDED':
      return { ...state, vehicles: [...state.vehicles, action.vehicle], selectedVehicleId: action.vehicle.id };
    case 'VEHICLE_REMOVED':
      return {
        ...state,
        vehicles: state.vehicles.filter((v) => v.id !== action.id),
        selectedVehicleId:
          state.selectedVehicleId === action.id ? action.fallbackSelectedId : state.selectedVehicleId,
      };
    case 'VEHICLE_SELECTED':
      return { ...state, selectedVehicleId: action.id };
    default:
      return state;
  }
}

interface FuelEntriesContextValue {
  loading: boolean;
  vehicles: Vehicle[];
  selectedVehicleId: number | null;
  selectedVehicle: Vehicle | undefined;
  entries: FuelEntry[];
  enrichedEntries: EnrichedFuelEntry[];
  historyEntries: EnrichedFuelEntry[];
  monthlyBreakdown: MonthlyBreakdownEntry[];
  distinctMonths: string[];
  getSummary: (month: string | null) => SummaryStats;
  getEntryById: (id: number) => FuelEntry | undefined;
  addEntry: (input: FuelEntryInput) => Promise<void>;
  updateEntry: (id: number, input: FuelEntryInput) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  selectVehicle: (id: number) => Promise<void>;
  addVehicle: (input: VehicleInput) => Promise<void>;
  deleteVehicle: (id: number) => Promise<void>;
  importBackup: (payload: RestorePayload) => Promise<void>;
}

const FuelEntriesContext = createContext<FuelEntriesContextValue | null>(null);

export function FuelEntriesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    vehicles: [],
    entries: [],
    selectedVehicleId: null,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      const [vehicles, entries, persistedSelectedId] = await Promise.all([
        vehicleRepository.listAll(),
        fuelEntryRepository.listAll(),
        settingsRepository.getSelectedVehicleId(),
      ]);
      const selectedVehicleId = vehicles.some((v) => v.id === persistedSelectedId)
        ? persistedSelectedId
        : (vehicles[0]?.id ?? null);
      dispatch({ type: 'LOADED', vehicles, entries, selectedVehicleId });
    })();
  }, []);

  // Every vehicle has its own independent odometer sequence — mixing them
  // would silently produce nonsense distances. Everything derived below is
  // scoped to only the selected vehicle's entries.
  const vehicleEntries = useMemo(
    () => state.entries.filter((e) => e.vehicleId === state.selectedVehicleId),
    [state.entries, state.selectedVehicleId]
  );

  const selectedVehicle = useMemo(
    () => state.vehicles.find((v) => v.id === state.selectedVehicleId),
    [state.vehicles, state.selectedVehicleId]
  );

  const getEntryById = useCallback(
    (id: number) => state.entries.find((e) => e.id === id),
    [state.entries]
  );

  const addEntry = useCallback(
    async (input: FuelEntryInput) => {
      if (state.selectedVehicleId === null) {
        throw new Error('Add a vehicle before logging a refuel.');
      }
      const result = validateFuelEntryInput(input, vehicleEntries);
      if (!result.valid) {
        throw new Error(result.error);
      }
      const record: FuelEntryRecord = { ...input, vehicleId: state.selectedVehicleId };
      const entry = await fuelEntryRepository.create(record);
      dispatch({ type: 'ENTRY_ADDED', entry });
    },
    [state.selectedVehicleId, vehicleEntries]
  );

  const updateEntry = useCallback(
    async (id: number, input: FuelEntryInput) => {
      const existing = state.entries.find((e) => e.id === id);
      if (!existing) {
        throw new Error('Entry not found.');
      }
      const sameVehicleEntries = state.entries.filter((e) => e.vehicleId === existing.vehicleId);
      const result = validateFuelEntryInput(input, sameVehicleEntries, id);
      if (!result.valid) {
        throw new Error(result.error);
      }
      const record: FuelEntryRecord = { ...input, vehicleId: existing.vehicleId };
      await fuelEntryRepository.update(id, record);
      dispatch({ type: 'ENTRY_UPDATED', entry: { id, createdAt: existing.createdAt, ...record } });
    },
    [state.entries]
  );

  const deleteEntry = useCallback(async (id: number) => {
    await fuelEntryRepository.remove(id);
    dispatch({ type: 'ENTRY_REMOVED', id });
  }, []);

  const selectVehicle = useCallback(async (id: number) => {
    dispatch({ type: 'VEHICLE_SELECTED', id });
    await settingsRepository.setSelectedVehicleId(id);
  }, []);

  const addVehicle = useCallback(async (input: VehicleInput) => {
    const vehicle = await vehicleRepository.create(input);
    dispatch({ type: 'VEHICLE_ADDED', vehicle });
    await settingsRepository.setSelectedVehicleId(vehicle.id);
  }, []);

  // Deliberately no cascade-delete: a vehicle with any logged entries can't
  // be removed, so there's no destructive path for history a user didn't
  // ask to lose. Only a vehicle added in error, before anything's recorded
  // against it, can be undone.
  const deleteVehicle = useCallback(
    async (id: number) => {
      const hasEntries = state.entries.some((e) => e.vehicleId === id);
      if (hasEntries) {
        throw new Error("This vehicle has logged entries and can't be deleted.");
      }
      await vehicleRepository.remove(id);
      const remaining = state.vehicles.filter((v) => v.id !== id);
      const fallbackSelectedId = remaining[0]?.id ?? null;
      dispatch({ type: 'VEHICLE_REMOVED', id, fallbackSelectedId });
      if (state.selectedVehicleId === id && fallbackSelectedId !== null) {
        await settingsRepository.setSelectedVehicleId(fallbackSelectedId);
      }
    },
    [state.entries, state.vehicles, state.selectedVehicleId]
  );

  // Restoring a backup replaces every vehicle and every entry. Each
  // vehicle's entries are validated as their own independent odometer
  // sequence, against an in-memory accumulator only — nothing is deleted or
  // written until the ENTIRE backup (every vehicle) is confirmed valid, so a
  // corrupt or hand-edited file can't leave the DB half-cleared.
  const importBackup = useCallback(
    async (payload: RestorePayload) => {
      const groups = payload.vehicles.map((_, index) =>
        payload.entries
          .filter((e) => e.vehicleIndex === index)
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      );

      groups.forEach((group, vehicleIndex) => {
        const provisional: FuelEntry[] = [];
        for (const { vehicleIndex: _vehicleIndex, ...rest } of group) {
          const result = validateFuelEntryInput(rest, provisional);
          if (!result.valid) {
            throw new Error(`Backup entry for ${rest.date} (vehicle ${vehicleIndex + 1}) is invalid: ${result.error}`);
          }
          provisional.push({ id: -1, vehicleId: -1, createdAt: new Date().toISOString(), ...rest });
        }
      });

      for (const existing of state.entries) {
        await fuelEntryRepository.remove(existing.id);
      }
      for (const existing of state.vehicles) {
        await vehicleRepository.remove(existing.id);
      }

      const newVehicles: Vehicle[] = [];
      for (const vehicleInput of payload.vehicles) {
        newVehicles.push(await vehicleRepository.create(vehicleInput));
      }

      const newEntries: FuelEntry[] = [];
      for (let index = 0; index < groups.length; index++) {
        const vehicleId = newVehicles[index].id;
        for (const { vehicleIndex: _vehicleIndex, ...rest } of groups[index]) {
          newEntries.push(await fuelEntryRepository.create({ ...rest, vehicleId }));
        }
      }

      const selectedVehicleId = newVehicles[0]?.id ?? null;
      if (selectedVehicleId !== null) {
        await settingsRepository.setSelectedVehicleId(selectedVehicleId);
      }
      dispatch({ type: 'RESTORED', vehicles: newVehicles, entries: newEntries, selectedVehicleId });
    },
    [state.entries, state.vehicles]
  );

  const enrichedEntries = useMemo(() => computeEnrichedEntries(vehicleEntries), [vehicleEntries]);
  const historyEntries = useMemo(() => sortHistoryDescending(enrichedEntries), [enrichedEntries]);
  const monthlyBreakdown = useMemo(() => computeMonthlyBreakdown(enrichedEntries), [enrichedEntries]);
  const distinctMonths = useMemo(() => listDistinctMonthsDescending(enrichedEntries), [enrichedEntries]);
  const getSummary = useCallback(
    (month: string | null) => computeSummary(enrichedEntries, month),
    [enrichedEntries]
  );

  const value = useMemo<FuelEntriesContextValue>(
    () => ({
      loading: state.loading,
      vehicles: state.vehicles,
      selectedVehicleId: state.selectedVehicleId,
      selectedVehicle,
      entries: state.entries,
      enrichedEntries,
      historyEntries,
      monthlyBreakdown,
      distinctMonths,
      getSummary,
      getEntryById,
      addEntry,
      updateEntry,
      deleteEntry,
      selectVehicle,
      addVehicle,
      deleteVehicle,
      importBackup,
    }),
    [
      state.loading,
      state.vehicles,
      state.selectedVehicleId,
      selectedVehicle,
      state.entries,
      enrichedEntries,
      historyEntries,
      monthlyBreakdown,
      distinctMonths,
      getSummary,
      getEntryById,
      addEntry,
      updateEntry,
      deleteEntry,
      selectVehicle,
      addVehicle,
      deleteVehicle,
      importBackup,
    ]
  );

  return <FuelEntriesContext.Provider value={value}>{children}</FuelEntriesContext.Provider>;
}

export function useFuelEntries(): FuelEntriesContextValue {
  const ctx = useContext(FuelEntriesContext);
  if (!ctx) {
    throw new Error('useFuelEntries must be used within a FuelEntriesProvider');
  }
  return ctx;
}
