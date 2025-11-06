// frontend/src/theme/ThemeModeProvider.tsx
import React from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider } from 'react-native-paper';
import { getTheme } from './core';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void> | void;
  effectiveScheme: Exclude<ColorSchemeName, null>;
};

const ThemeModeContext = React.createContext<ThemeModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'app.theme.mode';

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  // Default to system until we load a saved preference
  const [mode, setModeState] = React.useState<ThemeMode>('system');
  const systemScheme = useColorScheme() ?? 'light';
  const effectiveScheme: Exclude<ColorSchemeName, null> = mode === 'system' ? systemScheme : mode;
  const theme = getTheme(effectiveScheme);

  React.useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {}
    })();
  }, []);

  const setMode = React.useCallback(async (next: ThemeMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const value = React.useMemo(
    () => ({ mode, setMode, effectiveScheme }),
    [mode, setMode, effectiveScheme]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = React.useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}
