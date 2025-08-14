// app/_layout.tsx
import React from 'react';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Slot } from 'expo-router';
import { getTheme } from '@theme';
import { ToastProvider } from '../src/utils/ToastProvider';
import { installGlobalErrorHandlers } from '../src/utils/logger';

installGlobalErrorHandlers();

export default function RootLayout() {
  const scheme = useColorScheme() ?? 'light';
  const theme = getTheme(scheme);

  return (
    <PaperProvider theme={theme}>
      <ToastProvider>
        <Slot />
      </ToastProvider>
    </PaperProvider>
  );
}
