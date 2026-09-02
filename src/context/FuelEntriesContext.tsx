import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import * as fuelEntryRepository from '../db/fuelEntryRepository';
import {
  computeEnrichedEntries,
  computeMonthlyBreakdown,
  computeSummary,
  listDistinctMonthsDescending,
  sortHistoryDescending,
} from '../utils/mileageEngine';
import { validateFuelEntryInput } from '../utils/odometerValidation';
import type { EnrichedFuelEntry, FuelEntry, FuelEntryInput } from '../types/fuelEntry';
import type { MonthlyBreakdownEntry, SummaryStats } from '../types/analytics';

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
  monthlyBreakdown: MonthlyBreakdownEntry[];
  distinctMonths: string[];
  getSummary: (month: string | null) => SummaryStats;
  getEntryById: (id: number) => FuelEntry | undefined;
  addEntry: (input: FuelEntryInput) => Promise<void>;
  updateEntry: (id: number, input: FuelEntryInput) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  importBackup: (entries: FuelEntryInput[]) => Promise<void>;
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

  // Restoring a backup replaces all existing entries. Every entry is
  // validated up front, against an in-memory accumulator only — nothing is
  // deleted or written until the whole backup is confirmed valid, so a bad
  // backup file can't leave the DB half-cleared. Validation mirrors a manual
  // add/edit, since a hand-edited or foreign JSON file is exactly the kind
  // of external input worth checking at this boundary.
  const importBackup = useCallback(
    async (entries: FuelEntryInput[]) => {
      const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      const provisional: FuelEntry[] = [];
      for (const input of sorted) {
        const result = validateFuelEntryInput(input, provisional);
        if (!result.valid) {
          throw new Error(`Backup entry for ${input.date} is invalid: ${result.error}`);
        }
        provisional.push({ id: -1, createdAt: new Date().toISOString(), ...input });
      }

      for (const existing of state.entries) {
        await fuelEntryRepository.remove(existing.id);
      }

      const created: FuelEntry[] = [];
      for (const input of sorted) {
        created.push(await fuelEntryRepository.create(input));
      }

      dispatch({ type: 'LOADED', entries: created });
    },
    [state.entries]
  );

  const enrichedEntries = useMemo(() => computeEnrichedEntries(state.entries), [state.entries]);
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
      importBackup,
    }),
    [
      state.loading,
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
