export type VehicleType = 'two_wheeler' | 'four_wheeler';

export interface Vehicle {
  id: number;
  name: string;
  type: VehicleType;
  createdAt: string;
}

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt'>;
