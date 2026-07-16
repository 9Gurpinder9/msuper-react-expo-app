// app/_layout.tsx - Restored providers layout
import React from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeModeProvider } from '../src/theme/ThemeModeProvider';
import { ToastProvider } from '../src/utils/ToastProvider';
import { installGlobalErrorHandlers, logger } from '../src/utils/logger';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function AppShell() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <ToastProvider>
        <Slot />
      </ToastProvider>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  React.useEffect(() => {
    installGlobalErrorHandlers();
    logger.info('GlobalErrorHandlersInstalled');
  }, []);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      if (fontError) {
        logger.error('Failed to load Inter fonts', fontError);
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AppShell />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}

