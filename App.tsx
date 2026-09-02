import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, WorkSans_600SemiBold, WorkSans_700Bold } from '@expo-google-fonts/work-sans';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans';
import AppNavigator from './src/navigation/AppNavigator';
import { FuelEntriesProvider } from './src/context/FuelEntriesContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // touched on mount so the SQLite connection/schema is created before the first screen renders
    import('./src/db/database').then(({ getDatabase }) =>
      getDatabase().then(() => setDbReady(true))
    );
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && dbReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <FuelEntriesProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="dark" />
      </FuelEntriesProvider>
    </SafeAreaProvider>
  );
}
