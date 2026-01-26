// frontend/src/theme/colors.ts

import type { MD3Theme } from 'react-native-paper'

/**
 * Full MD3 “dynamic” color roles for light mode.
 * Copy/paste from the Paper docs and tweak as you like.
 */
export const lightColors: MD3Theme['colors'] = {
  primary:              '#ff5400', // blaze-orange
  onPrimary:            '#ffffff',
  primaryContainer:     '#ffd9c2',
  onPrimaryContainer:   '#3a1300',

  secondary:            '#00b4d8', // turquoise-surf
  onSecondary:          '#ffffff',
  secondaryContainer:   '#c5f2fb',
  onSecondaryContainer: '#00313a',

  tertiary:             '#023e8a', // french-blue
  onTertiary:           '#ffffff',
  tertiaryContainer:    '#cfe0ff',
  onTertiaryContainer:  '#001536',

  error:                'rgb(186, 26, 26)',
  onError:              'rgb(255, 255, 255)',
  errorContainer:       'rgb(255, 218, 214)',
  onErrorContainer:     'rgb(65, 0, 2)',

  background:           '#fff7f0',
  onBackground:         '#1d140f',
  surface:              '#ffffff',
  onSurface:            '#1d140f',

  surfaceVariant:       '#f6e6dc',
  onSurfaceVariant:     '#5e4a3f',
  outline:              '#8a766b',
  outlineVariant:       '#dcc8bc',

  shadow:               'rgb(0, 0, 0)',
  scrim:                'rgb(0, 0, 0)',
  inverseSurface:       '#1d140f',
  inverseOnSurface:     '#fff7f0',
  inversePrimary:       '#ff9e00',

  elevation: {
    level0: 'transparent',
    level1: '#fff1e7',
    level2: '#ffeade',
    level3: '#ffe4d6',
    level4: '#ffdfcf',
    level5: '#ffd9c7',
  },

  surfaceDisabled:      'rgba(29, 20, 15, 0.12)',
  onSurfaceDisabled:    'rgba(29, 20, 15, 0.38)',
  backdrop:             'rgba(3, 4, 94, 0.35)',
}

/**
 * Full MD3 “dynamic” color roles for dark mode.
 */
export const darkColors: MD3Theme['colors'] = {
  primary:              '#ff9e00', // amber-glow
  onPrimary:            '#3a1f00',
  primaryContainer:     '#ff6d00', // pumpkin-spice
  onPrimaryContainer:   '#2a1200',

  secondary:            '#00b4d8', // turquoise-surf
  onSecondary:          '#002a33',
  secondaryContainer:   '#0096c7', // blue-green
  onSecondaryContainer: '#d8f6ff',

  tertiary:             '#023e8a', // french-blue
  onTertiary:           '#e6edff',
  tertiaryContainer:    '#03045e', // deep-twilight
  onTertiaryContainer:  '#dfe6ff',

  error:                'rgb(255, 180, 171)',
  onError:              'rgb(105, 0, 5)',
  errorContainer:       'rgb(147, 0, 10)',
  onErrorContainer:     'rgb(255, 180, 171)',

  background:           '#03045e',
  onBackground:         '#edf1ff',
  surface:              '#022c69',
  onSurface:            '#edf1ff',

  surfaceVariant:       '#01315f',
  onSurfaceVariant:     '#c7d5f0',
  outline:              '#5b6e98',
  outlineVariant:       '#2b3b64',

  shadow:               'rgb(0, 0, 0)',
  scrim:                'rgb(0, 0, 0)',
  inverseSurface:       '#edf1ff',
  inverseOnSurface:     '#03045e',
  inversePrimary:       '#ff5400',

  elevation: {
    level0: 'transparent',
    level1: '#04206d',
    level2: '#04297a',
    level3: '#043286',
    level4: '#043a92',
    level5: '#04429e',
  },

  surfaceDisabled:      'rgba(237, 241, 255, 0.12)',
  onSurfaceDisabled:    'rgba(237, 241, 255, 0.38)',
  backdrop:             'rgba(3, 4, 94, 0.65)',
}
