import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import * as fuelEntryRepository from '../db/fuelEntryRepository';
import type { FuelEntry } from '../types/fuelEntry';

interface State {
  entries: FuelEntry[];
  loading: boolean;
}

type Action = { type: 'LOADED'; entries: FuelEntry[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return { entries: action.entries, loading: false };
    default:
      return state;
  }
}

interface FuelEntriesContextValue extends State {}

const FuelEntriesContext = createContext<FuelEntriesContextValue | null>(null);

export function FuelEntriesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { entries: [], loading: true });

  useEffect(() => {
    fuelEntryRepository.listAll().then((entries) => dispatch({ type: 'LOADED', entries }));
  }, []);

  const value = useMemo(() => state, [state]);

  return <FuelEntriesContext.Provider value={value}>{children}</FuelEntriesContext.Provider>;
}

export function useFuelEntries(): FuelEntriesContextValue {
  const ctx = useContext(FuelEntriesContext);
  if (!ctx) {
    throw new Error('useFuelEntries must be used within a FuelEntriesProvider');
  }
  return ctx;
}
