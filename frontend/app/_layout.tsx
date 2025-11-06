// app/_layout.tsx
import React from 'react';
import { useColorScheme } from 'react-native';
import { Slot } from 'expo-router';
import { ThemeModeProvider } from '@theme';
import { ToastProvider } from '../src/utils/ToastProvider';
import { installGlobalErrorHandlers } from '../src/utils/logger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

installGlobalErrorHandlers();

export default function RootLayout() {
  // Keep hook to re-render on system changes so the provider can pick them up
  useColorScheme();
  const [client] = React.useState(() => new QueryClient());

  return (
    <ThemeModeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <Slot />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}
