import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPANDED_KEY = 'sidebar_expanded';
const BREAKPOINT = 768;

type DrawerMode = 'overlay' | 'persistent';

type DrawerContextType = {
  open: boolean;
  expanded: boolean;
  mode: DrawerMode;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const mode: DrawerMode = width >= BREAKPOINT ? 'persistent' : 'overlay';
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem(EXPANDED_KEY);
        if (val !== null) {
          setExpanded(val === 'true');
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (mode === 'persistent') {
      setOpen(false);
    }
  }, [mode]);

  const persistExpanded = useCallback(async (val: boolean) => {
    try {
      await AsyncStorage.setItem(EXPANDED_KEY, String(val));
    } catch {}
  }, []);

  const openDrawer = useCallback(() => {
    if (mode === 'overlay') {
      setOpen(true);
    } else {
      setExpanded(true);
      persistExpanded(true);
    }
  }, [mode, persistExpanded]);

  const closeDrawer = useCallback(() => {
    if (mode === 'overlay') {
      setOpen(false);
    } else {
      setExpanded(false);
      persistExpanded(false);
    }
  }, [mode, persistExpanded]);

  const toggleDrawer = useCallback(() => {
    if (mode === 'overlay') {
      setOpen((prev) => !prev);
    } else {
      setExpanded((prev) => {
        const next = !prev;
        persistExpanded(next);
        return next;
      });
    }
  }, [mode, persistExpanded]);

  return (
    <DrawerContext.Provider value={{ open, expanded, mode, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}
