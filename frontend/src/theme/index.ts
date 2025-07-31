// src/theme/index.ts

import {
  MD3LightTheme as DefaultLight,
  MD3DarkTheme  as DefaultDark,
} from 'react-native-paper'
import type { ColorSchemeName } from 'react-native'

import { lightColors, darkColors } from './colors'
import { fontSizes, fontWeights }  from './typography'
import { spacing }                 from './spacing'

export const lightTheme = {
  ...DefaultLight,
  colors:     lightColors,
  typography: { fontSizes, fontWeights },
  spacing,
}

export const darkTheme = {
  ...DefaultDark,
  colors:     darkColors,
  typography: { fontSizes, fontWeights },
  spacing,
}

/**
 * Pick the appropriate theme given the system scheme.
 * @param scheme 'light' | 'dark' | null
 */
export function getTheme(scheme: ColorSchemeName) {
  return scheme === 'dark' ? darkTheme : lightTheme
}
