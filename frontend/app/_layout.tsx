// app/_layout.tsx - Restored providers layout
import React from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeModeProvider } from '../src/theme/ThemeModeProvider';
import { ToastProvider } from '../src/utils/ToastProvider';
import { installGlobalErrorHandlers, logger } from '../src/utils/logger';

const queryClient = new QueryClient();

export default function RootLayout() {
  React.useEffect(() => {
    installGlobalErrorHandlers();
    logger.info('GlobalErrorHandlersInstalled');
  }, []);

  return (
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <Slot />
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}
