import { Theme } from '../types';

export const theme: Theme = {
  colors: {
    primary: '#0055ff', // Primary brand color as specified in requirements
    secondary: '#6c757d',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#212529',
    textSecondary: '#6c757d',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    border: '#dee2e6',
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