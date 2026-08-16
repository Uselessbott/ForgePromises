import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useColors } from '@/hooks/useColors';
import { HabitsProvider, useHabits } from '@/context/HabitsContext';
import {
  setupNotificationChannel,
  requestNotificationPermissions,
  scheduleMidnightReset,
  testNotification,
} from '@/utils/notifications';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colors = useColors();
  const { updateSettings, isLoading } = useHabits();

  useEffect(() => {
    if (isLoading) return;

    setupNotificationChannel().then(() => {
      requestNotificationPermissions().then(granted => {
        updateSettings({ notificationsEnabled: granted });
      });
    });
  }, [isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="habit-form"
        options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="category-form"
        options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="weekly-review"
        options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <HabitsProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </HabitsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
