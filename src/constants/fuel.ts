import type { FuelType } from '../types/trip';

export const FUEL_TYPE_ICON: Record<FuelType, string> = {
  petrol: '⛽',
  diesel: '🛢️',
};

export const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
};
