// frontend/src/theme/types.ts
import type { MD3Theme } from 'react-native-paper';

export type AppThemeColors = MD3Theme['colors'] & {
  success: string;
  onSuccess: string;
  warning: string;
  onWarning: string;
  info: string;
  onInfo: string;
};

export type AppTheme = Omit<MD3Theme, 'colors'> & {
  colors: AppThemeColors;
  // expose optional extensions already present in this project
  typography?: { fontSizes: Record<string, number>; fontWeights: Record<string, string> };
  spacing?: Record<string, number>;
};

