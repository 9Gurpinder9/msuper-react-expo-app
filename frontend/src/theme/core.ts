// frontend/src/theme/core.ts
import {
  MD3LightTheme as DefaultLight,
  MD3DarkTheme as DefaultDark,
} from 'react-native-paper';
import type { ColorSchemeName } from 'react-native';

import { lightColors, darkColors } from './colors';
import { fontSizes, fontWeights } from './typography';
import { spacing } from './spacing';
import type { AppTheme } from './types';

// Semantic color additions harmonized with MD3 baseline
const lightSemantic = {
  success: 'rgb(46, 125, 50)', // #2e7d32
  onSuccess: 'rgb(255, 255, 255)',
  warning: '#ff6d00', // pumpkin-spice
  onWarning: '#ffffff',
  info: '#00b4d8', // turquoise-surf
  onInfo: '#ffffff',
};
const darkSemantic = {
  success: 'rgb(129, 199, 132)', // #81c784
  onSuccess: 'rgb(0, 56, 28)',
  warning: '#ff9e00', // amber-glow
  onWarning: '#2a1200',
  info: '#0096c7', // blue-green
  onInfo: '#d8f6ff',
};

export const lightTheme: AppTheme = {
  ...(DefaultLight as any),
  colors: { ...(lightColors as any), ...lightSemantic },
  typography: { fontSizes, fontWeights },
  spacing,
};

export const darkTheme: AppTheme = {
  ...(DefaultDark as any),
  colors: { ...(darkColors as any), ...darkSemantic },
  typography: { fontSizes, fontWeights },
  spacing,
};

export function getTheme(scheme: ColorSchemeName): AppTheme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
