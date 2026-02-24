import { Theme } from '../types';

export const theme: Theme = {
  colors: {
    // Cores principais da Engefil
    primary: '#1e3a8a', // Azul escuro profissional
    secondary: '#f59e0b', // Amarelo/laranja para destaques
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    border: '#e2e8f0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal',
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal',
    },
  },
};

// Dark theme variant
export const darkTheme: Theme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#333333',
  },
};

// Helper functions for theme usage
export const getSpacing = (size: keyof Theme['spacing']): number => {
  return theme.spacing[size];
};

export const getColor = (color: keyof Theme['colors']): string => {
  return theme.colors[color];
};

export const getTypography = (variant: keyof Theme['typography']) => {
  return theme.typography[variant];
};