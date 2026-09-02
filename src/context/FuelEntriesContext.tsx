import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import * as fuelEntryRepository from '../db/fuelEntryRepository';
import { computeEnrichedEntries, sortHistoryDescending } from '../utils/mileageEngine';
import { validateFuelEntryInput } from '../utils/odometerValidation';
import type { EnrichedFuelEntry, FuelEntry, FuelEntryInput } from '../types/fuelEntry';

interface State {
  entries: FuelEntry[];
  loading: boolean;
}

type Action =
  | { type: 'LOADED'; entries: FuelEntry[] }
  | { type: 'ADDED'; entry: FuelEntry }
  | { type: 'UPDATED'; entry: FuelEntry }
  | { type: 'REMOVED'; id: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return { entries: action.entries, loading: false };
    case 'ADDED':
      return { ...state, entries: [...state.entries, action.entry] };
    case 'UPDATED':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.entry.id ? action.entry : e)),
      };
    case 'REMOVED':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    default:
      return state;
  }
}

interface FuelEntriesContextValue {
  loading: boolean;
  entries: FuelEntry[];
  enrichedEntries: EnrichedFuelEntry[];
  historyEntries: EnrichedFuelEntry[];
  getEntryById: (id: number) => FuelEntry | undefined;
  addEntry: (input: FuelEntryInput) => Promise<void>;
  updateEntry: (id: number, input: FuelEntryInput) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
}

const FuelEntriesContext = createContext<FuelEntriesContextValue | null>(null);

export function FuelEntriesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { entries: [], loading: true });

  useEffect(() => {
    fuelEntryRepository.listAll().then((entries) => dispatch({ type: 'LOADED', entries }));
  }, []);

  const getEntryById = useCallback(
    (id: number) => state.entries.find((e) => e.id === id),
    [state.entries]
  );

  const addEntry = useCallback(
    async (input: FuelEntryInput) => {
      const result = validateFuelEntryInput(input, state.entries);
      if (!result.valid) {
        throw new Error(result.error);
      }
      const entry = await fuelEntryRepository.create(input);
      dispatch({ type: 'ADDED', entry });
    },
    [state.entries]
  );

  const updateEntry = useCallback(
    async (id: number, input: FuelEntryInput) => {
      const result = validateFuelEntryInput(input, state.entries, id);
      if (!result.valid) {
        throw new Error(result.error);
      }
      const existing = state.entries.find((e) => e.id === id);
      await fuelEntryRepository.update(id, input);
      dispatch({ type: 'UPDATED', entry: { id, createdAt: existing?.createdAt ?? new Date().toISOString(), ...input } });
    },
    [state.entries]
  );

  const deleteEntry = useCallback(async (id: number) => {
    await fuelEntryRepository.remove(id);
    dispatch({ type: 'REMOVED', id });
  }, []);

  const enrichedEntries = useMemo(() => computeEnrichedEntries(state.entries), [state.entries]);
  const historyEntries = useMemo(() => sortHistoryDescending(enrichedEntries), [enrichedEntries]);

  const value = useMemo<FuelEntriesContextValue>(
    () => ({
      loading: state.loading,
      entries: state.entries,
      enrichedEntries,
      historyEntries,
      getEntryById,
      addEntry,
      updateEntry,
      deleteEntry,
    }),
    [state.loading, state.entries, enrichedEntries, historyEntries, getEntryById, addEntry, updateEntry, deleteEntry]
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
