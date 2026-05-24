export const colors = {
  surface: '#f4faff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#e9f6fd',
  surfaceContainer: '#e3f0f8',
  surfaceContainerHigh: '#ddeaf2',
  surfaceVariant: '#d7e4ec',
  onSurface: '#111d23',
  onSurfaceVariant: '#5b3f43',
  primary: '#b80049',
  primaryContainer: '#e2165f',
  onPrimary: '#ffffff',
  secondary: '#6b5a60',
  secondaryContainer: '#f4dce4',
  tertiary: '#00685e',
  tertiaryContainer: '#008377',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  outlineVariant: '#e4bdc2',
  warning: '#f59e0b',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const typography = {
  display: {
    fontFamily: 'Cairo',
    fontSize: 28,
    fontWeight: '700' as const,
  },
  heading: {
    fontFamily: 'Cairo',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  title: {
    fontFamily: 'Cairo',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: 'Cairo',
    fontSize: 14,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: 'Cairo',
    fontSize: 12,
    fontWeight: '500' as const,
  },
};

export const appTheme = {
  colors,
  spacing,
  radius,
  typography,
};