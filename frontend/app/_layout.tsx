// app/_layout.tsx
import React from 'react';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Slot } from 'expo-router';
import { getTheme } from '@theme';
import { ToastProvider } from '../src/utils/ToastProvider';
import { installGlobalErrorHandlers } from '../src/utils/logger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

installGlobalErrorHandlers();

export default function RootLayout() {
  const scheme = useColorScheme() ?? 'light';
  const theme = getTheme(scheme);
  const [client] = React.useState(() => new QueryClient());

  return (
    <PaperProvider theme={theme}>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <Slot />
        </ToastProvider>
      </QueryClientProvider>
    </PaperProvider>
  );
}
