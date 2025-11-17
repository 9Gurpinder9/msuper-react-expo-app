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
  warning: 'rgb(237, 108, 2)', // #ed6c02
  onWarning: 'rgb(255, 255, 255)',
  info: 'rgb(2, 136, 209)', // #0288d1
  onInfo: 'rgb(255, 255, 255)',
};
const darkSemantic = {
  success: 'rgb(129, 199, 132)', // #81c784
  onSuccess: 'rgb(0, 56, 28)',
  warning: 'rgb(255, 183, 77)', // #ffb74d
  onWarning: 'rgb(78, 43, 0)',
  info: 'rgb(79, 195, 247)', // #4fc3f7
  onInfo: 'rgb(0, 42, 69)',
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
