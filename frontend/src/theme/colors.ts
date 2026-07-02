// frontend/src/theme/colors.ts

import type { MD3Theme } from 'react-native-paper'

/**
 * Full MD3 “dynamic” color roles for light mode.
 * Copy/paste from the Paper docs and tweak as you like.
 */
// ==========================================
// THEME 1 (Electric Corporate - Blue/Orange)
// ==========================================
export const lightColors: MD3Theme['colors'] = {
  primary: '#0046ff',
  onPrimary: '#ffffff',
  primaryContainer: '#DBEAFE',
  onPrimaryContainer: '#001bb7',
  secondary: '#ff8040',
  onSecondary: '#ffffff',
  secondaryContainer: '#FFE5D9',
  onSecondaryContainer: '#9A3412',
  tertiary: '#001bb7',
  onTertiary: '#ffffff',
  tertiaryContainer: '#E0E7FF',
  onTertiaryContainer: '#4338CA',
  error: 'rgb(186, 26, 26)',
  onError: 'rgb(255, 255, 255)',
  errorContainer: 'rgb(255, 218, 214)',
  onErrorContainer: 'rgb(65, 0, 2)',
  background: '#FEFAE5',
  onBackground: '#0F172A',
  surface: '#FEFAE5',
  onSurface: '#0F172A',
  surfaceVariant: '#F2EED9',
  onSurfaceVariant: '#001bb7',
  outline: '#CBD5E1',
  outlineVariant: '#E2E8F0',
  shadow: 'rgb(0, 0, 0)',
  scrim: 'rgb(0, 0, 0)',
  inverseSurface: '#0F172A',
  inverseOnSurface: '#F8FAFC',
  inversePrimary: '#60A5FA',
  elevation: {
    level0: 'transparent',
    level1: '#FEFAE5',
    level2: '#F8F4DF',
    level3: '#F2EED9',
    level4: '#EAE5CF',
    level5: '#DED8BA',
  },
  surfaceDisabled: 'rgba(15, 23, 42, 0.12)',
  onSurfaceDisabled: 'rgba(15, 23, 42, 0.38)',
  backdrop: 'rgba(15, 23, 42, 0.35)',
}

export const darkColors: MD3Theme['colors'] = {
  primary: '#818CF8', // Softer, calmer indigo
  onPrimary: '#1E1B4B',
  primaryContainer: '#2A285C', // Muted deep dark indigo container
  onPrimaryContainer: '#E0E7FF', // Soft ice blue/lavender text
  secondary: '#FB923C', // Calm warm desaturated orange
  onSecondary: '#431407',
  secondaryContainer: '#5F2514', // Warm desaturated dark rust
  onSecondaryContainer: '#FFEDD5', // Soft warm cream text
  tertiary: '#38BDF8', // Calm sky blue
  onTertiary: '#082F49',
  tertiaryContainer: '#0C4A6E',
  onTertiaryContainer: '#E0F2FE',
  error: 'rgb(255, 180, 171)',
  onError: 'rgb(105, 0, 5)',
  errorContainer: 'rgb(147, 0, 10)',
  onErrorContainer: 'rgb(255, 180, 171)',
  background: '#0B0C16', // Slightly warmer dark base
  onBackground: '#E2E8F0',
  surface: '#121324', // Warm dark card surface
  onSurface: '#F8FAFC',
  surfaceVariant: '#1E1F3B',
  onSurfaceVariant: '#94A3B8',
  outline: '#475569',
  outlineVariant: '#334155',
  shadow: 'rgb(0, 0, 0)',
  scrim: 'rgb(0, 0, 0)',
  inverseSurface: '#F8FAFC',
  inverseOnSurface: '#0F172A',
  inversePrimary: '#818CF8',
  elevation: {
    level0: 'transparent',
    level1: '#121324',
    level2: '#17182E',
    level3: '#1C1D38',
    level4: '#222342',
    level5: '#27294D',
  },
  surfaceDisabled: 'rgba(248, 250, 252, 0.12)',
  onSurfaceDisabled: 'rgba(248, 250, 252, 0.38)',
  backdrop: 'rgba(15, 23, 42, 0.65)',
}

/*
// ==========================================
// THEME 2 (Warm Espresso / Earth tones)
// ==========================================
export const lightColors: MD3Theme['colors'] = {
  primary:              '#622b14', // Deep Espresso Brown
  onPrimary:            '#ffffff',
  primaryContainer:     '#e4d6a9', // Light Cream
  onPrimaryContainer:   '#622b14',
  secondary:            '#995f2f', // Caramel Brown
  onSecondary:          '#ffffff',
  secondaryContainer:   '#f5ecd2',
  onSecondaryContainer: '#622b14',
  tertiary:             '#978f66', // Sage / Khaki
  onTertiary:           '#ffffff',
  tertiaryContainer:    '#f0ebd5',
  onTertiaryContainer:  '#622b14',
  error:                'rgb(186, 26, 26)',
  onError:              'rgb(255, 255, 255)',
  errorContainer:       'rgb(255, 218, 214)',
  onErrorContainer:     'rgb(65, 0, 2)',
  background:           '#e4d6a9', // Light Ivory / Cream
  onBackground:         '#622b14',
  surface:              '#ffffff',
  onSurface:            '#622b14',
  surfaceVariant:       '#f3ebd2',
  onSurfaceVariant:     '#622b14',
  outline:              '#bfae92', 
  outlineVariant:       '#dcd4be', 
  shadow:               'rgb(0, 0, 0)',
  scrim:                'rgb(0, 0, 0)',
  inverseSurface:       '#622b14',
  inverseOnSurface:     '#e4d6a9',
  inversePrimary:       '#995f2f',
  elevation: {
    level0: 'transparent',
    level1: '#ffffff',
    level2: '#fbf8f0',
    level3: '#f7f2e1',
    level4: '#f3ebd2',
    level5: '#e8dcba',
  },
  surfaceDisabled:      'rgba(98, 43, 20, 0.12)',
  onSurfaceDisabled:    'rgba(98, 43, 20, 0.38)',
  backdrop:             'rgba(98, 43, 20, 0.35)',
}

export const darkColors: MD3Theme['colors'] = {
  primary:              '#e4d6a9', // Light Cream for text contrast
  onPrimary:            '#622b14',
  primaryContainer:     '#622b14', // Deep Espresso Brown
  onPrimaryContainer:   '#e4d6a9',
  secondary:            '#995f2f', // Caramel Brown
  onSecondary:          '#ffffff',
  secondaryContainer:   '#4a200d',
  onSecondaryContainer: '#f5ecd2',
  tertiary:             '#978f66', // Sage / Khaki
  onTertiary:           '#1a0b05',
  tertiaryContainer:    '#302c1d',
  onTertiaryContainer:  '#f0ebd5',
  error:                'rgb(255, 180, 171)',
  onError:              'rgb(105, 0, 5)',
  errorContainer:       'rgb(147, 0, 10)',
  onErrorContainer:     'rgb(255, 180, 171)',
  background:           '#1c0c05', // Rich Dark Chocolate base
  onBackground:         '#e4d6a9',
  surface:              '#281208', // Warm surface card backing
  onSurface:            '#F8FAFC',
  surfaceVariant:       '#3b1c0e', 
  onSurfaceVariant:     '#bfae92',
  outline:              '#756553', 
  outlineVariant:       '#4b3e31',
  shadow:               'rgb(0, 0, 0)',
  scrim:                'rgb(0, 0, 0)',
  inverseSurface:       '#e4d6a9',
  inverseOnSurface:     '#1a0b05',
  inversePrimary:       '#622b14',
  elevation: {
    level0: 'transparent',
    level1: '#281208',
    level2: '#30160b',
    level3: '#391a0e',
    level4: '#421f11',
    level5: '#4b2414',
  },
  surfaceDisabled:      'rgba(228, 214, 169, 0.12)',
  onSurfaceDisabled:    'rgba(228, 214, 169, 0.38)',
  backdrop:             'rgba(26, 11, 5, 0.65)',
}
*/

/*
// ==========================================
// THEME 3 (Forest Green / Sage palette)
// ==========================================
export const lightColors: MD3Theme['colors'] = {
  primary:              '#0d530e', // Deep Olive / Dark Green
  onPrimary:            '#ffffff',
  primaryContainer:     '#e7e1b1', // Soft Khaki / Sage
  onPrimaryContainer:   '#0d530e',

  secondary:            '#306d29', // Forest Green
  onSecondary:          '#ffffff',
  secondaryContainer:   '#f4f0df',
  onSecondaryContainer: '#0d530e',

  tertiary:             '#306d29',
  onTertiary:           '#ffffff',
  tertiaryContainer:    '#e1dbb5',
  onTertiaryContainer:  '#0d530e',

  error:                'rgb(186, 26, 26)',
  onError:              'rgb(255, 255, 255)',
  errorContainer:       'rgb(255, 218, 214)',
  onErrorContainer:     'rgb(65, 0, 2)',

  background:           '#fbf5dd', // Light Sand / Cream background
  onBackground:         '#0d530e',
  surface:              '#ffffff',
  onSurface:            '#0d530e',

  surfaceVariant:       '#f3ebd2',
  onSurfaceVariant:     '#0d530e',
  outline:              '#bfae92', 
  outlineVariant:       '#dcd4be', 

  shadow:               'rgb(0, 0, 0)',
  scrim:                'rgb(0, 0, 0)',
  inverseSurface:       '#0d530e',
  inverseOnSurface:     '#fbf5dd',
  inversePrimary:       '#306d29',

  elevation: {
    level0: 'transparent',
    level1: '#ffffff',
    level2: '#fbf8f0',
    level3: '#f7f2e1',
    level4: '#f3ebd2',
    level5: '#e8dcba',
  },

  surfaceDisabled:      'rgba(13, 83, 14, 0.12)',
  onSurfaceDisabled:    'rgba(13, 83, 14, 0.38)',
  backdrop:             'rgba(13, 83, 14, 0.35)',
}

export const darkColors: MD3Theme['colors'] = {
  primary:              '#e7e1b1', // Soft Khaki for high text contrast
  onPrimary:            '#0d530e',
  primaryContainer:     '#0d530e', // Deep Dark Green
  onPrimaryContainer:   '#e7e1b1',

  secondary:            '#306d29', // Forest Green
  onSecondary:          '#ffffff',
  secondaryContainer:   '#051c05',
  onSecondaryContainer: '#f4f0df',

  tertiary:             '#306d29',
  onTertiary:           '#fbf5dd',
  tertiaryContainer:    '#112611',
  onTertiaryContainer:  '#e7e1b1',

  error:                'rgb(255, 180, 171)',
  onError:              'rgb(105, 0, 5)',
  errorContainer:       'rgb(147, 0, 10)',
  onErrorContainer:     'rgb(255, 180, 171)',

  background:           '#041505', // Very dark green-black
  onBackground:         '#fbf5dd',
  surface:              '#0a220b', // Forest card base
  onSurface:            '#F8FAFC',

  surfaceVariant:       '#0e2d0f', 
  onSurfaceVariant:     '#bfae92',
  outline:              '#756553', 
  outlineVariant:       '#4b3e31',

  shadow:               'rgb(0, 0, 0)',
  scrim:                'rgb(0, 0, 0)',
  inverseSurface:       '#fbf5dd',
  inverseOnSurface:     '#041505',
  inversePrimary:       '#0d530e',

  elevation: {
    level0: 'transparent',
    level1: '#0a220b',
    level2: '#0d2b0e',
    level3: '#103411',
    level4: '#133d14',
    level5: '#164617',
  },

  surfaceDisabled:      'rgba(231, 225, 177, 0.12)',
  onSurfaceDisabled:    'rgba(231, 225, 177, 0.38)',
  backdrop:             'rgba(4, 21, 5, 0.65)',
}
*/
