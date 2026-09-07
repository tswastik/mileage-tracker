import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
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
import { colors } from './src/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Shown while fonts/DB are loading, in place of the app's real screens.
// Its onLayout hides the native splash screen as soon as THIS has painted a
// frame -- get that wrong (e.g. hide on the final app's layout instead) and
// the opaque native splash stays up for the entire loading window, this
// screen renders invisibly underneath it, and the app appears to jump
// straight from Expo Go's own splash to the fully-loaded Dashboard.
// Custom fonts aren't guaranteed loaded yet at this point, so this uses the
// system default font rather than `fonts.*` from the theme. This is also
// the only branded loading screen visible when testing via Expo Go, since
// Expo Go always shows its own native icon/splash and ignores app.json's
// icon/splash config (that only applies to a real native build).
function LoadingScreen() {
  const handleLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.loadingContainer} onLayout={handleLayout}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
      <Image source={require('./assets/icon.png')} style={styles.loadingIcon} resizeMode="contain" />
      <Text style={styles.loadingTitle}>Mileage Tracker</Text>
    </View>
  );
}

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

  if (!fontsLoaded || !dbReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <FuelEntriesProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="dark" />
      </FuelEntriesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
