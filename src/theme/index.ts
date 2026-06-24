import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// ── Palette ──────────────────────────────────────────────────────────────────
// Light: clean white surfaces, deep teal primary, warm amber accent
// Dark:  deep navy canvas, vibrant emerald primary, soft gold accent

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00897B',          // deep teal
    onPrimary: '#FFFFFF',
    primaryContainer: '#B2DFDB',
    onPrimaryContainer: '#00251A',
    secondary: '#F59E0B',        // amber accent
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FEF3C7',
    onSecondaryContainer: '#78350F',
    tertiary: '#6366F1',         // indigo
    error: '#DC2626',
    onError: '#FFFFFF',
    background: '#F0F4F8',
    onBackground: '#0F172A',
    surface: '#FFFFFF',
    onSurface: '#1E293B',
    surfaceVariant: '#E2E8F0',
    onSurfaceVariant: '#475569',
    outline: '#CBD5E1',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F8FAFC',
      level3: '#F1F5F9',
      level4: '#E2E8F0',
      level5: '#CBD5E1',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#34D399',          // emerald green
    onPrimary: '#022C22',
    primaryContainer: '#065F46',
    onPrimaryContainer: '#6EE7B7',
    secondary: '#FBBF24',        // amber
    onSecondary: '#1C1917',
    secondaryContainer: '#92400E',
    onSecondaryContainer: '#FDE68A',
    tertiary: '#818CF8',         // indigo
    error: '#F87171',
    onError: '#450A0A',
    background: '#0F172A',       // deep navy
    onBackground: '#E2E8F0',
    surface: '#1E293B',          // slate
    onSurface: '#F1F5F9',
    surfaceVariant: '#334155',
    onSurfaceVariant: '#94A3B8',
    outline: '#475569',
    elevation: {
      level0: 'transparent',
      level1: '#1E293B',
      level2: '#243347',
      level3: '#273C52',
      level4: '#2E4A63',
      level5: '#344F6A',
    },
  },
};
