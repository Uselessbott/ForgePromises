import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { HabitsProvider } from './context/HabitsContext';
import { HomeScreen } from './screens/HomeScreen';

export default function App() {
  // Register widgets after app initializes
  useEffect(() => {
    try {
      // Progress Widget

      // Tasks Widget

      // Combined Widget
    } catch (error) {
      console.log('Widget registration error:', error);
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <HabitsProvider>
        <HomeScreen />
      </HabitsProvider>
    </SafeAreaView>
  );
}
