import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  MainTabs: undefined;
  AddEditEntry: { entryId?: number } | undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  HistoryTab: undefined;
  CalculatorTab: undefined;
  SettingsTab: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type DashboardTabScreenProps = MainTabScreenProps<'DashboardTab'>;
export type HistoryTabScreenProps = MainTabScreenProps<'HistoryTab'>;
export type CalculatorTabScreenProps = MainTabScreenProps<'CalculatorTab'>;
export type SettingsTabScreenProps = MainTabScreenProps<'SettingsTab'>;
export type AddEditEntryScreenProps = RootStackScreenProps<'AddEditEntry'>;
