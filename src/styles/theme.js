// Theme colors basato sul design FITSLOT
export const colors = {
  // Background
  background: '#1A1F2E',
  backgroundLight: '#252B3D',
  
  // Accent colors
  primary: '#3B9DFF',
  primaryDark: '#2B7DD9',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#8B92A8',
  textTertiary: '#5A6076',
  
  // Status colors
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#EF4444',
  
  // Card colors
  cardBackground: 'rgba(37, 43, 61, 0.6)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  
  // Input colors
  inputBackground: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  
  // Button colors
  buttonDisabled: '#5A6076',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal',
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal',
    color: colors.textTertiary,
  },
};