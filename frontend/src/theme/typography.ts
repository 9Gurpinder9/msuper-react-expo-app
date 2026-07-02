// typography.ts
// Centralize font sizes, weights, and global Inter font configurations.
export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const fontSizes = {
  heading: 24,
  subheading: 20,
  body: 16,
  caption: 12,
};

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  bold: '700' as const,
};

// Mapping of custom MD3 typography variants to load custom Inter weights natively
export const md3FontConfig = {
  displayLarge: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  displayMedium: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  displaySmall: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  headlineLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  headlineMedium: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  headlineSmall: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  titleLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  titleSmall: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  labelLarge: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  labelMedium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  labelSmall: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  bodyLarge: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  bodySmall: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
};

