import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { colors, fonts } from '../constants/theme';
import MainTabs from './MainTabs';
import AddEditEntryScreen from '../screens/AddEditEntryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEditEntry"
        component={AddEditEntryScreen}
        options={({ route }) => ({
          presentation: 'modal',
          title: route.params?.entryId ? 'Edit Refuel' : 'Log Refuel',
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontFamily: fonts.bodySemiBold, color: colors.textPrimary },
          headerTintColor: colors.forestGreen,
        })}
      />
    </Stack.Navigator>
  );
}
