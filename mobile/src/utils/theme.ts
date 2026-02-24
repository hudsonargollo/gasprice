import { Theme } from '../types';

export const theme: Theme = {
  colors: {
    // Cores principais da Engefil - Laranja como cor primária
    primary: '#f59e0b', // Laranja Engefil como cor principal
    secondary: '#ea580c', // Laranja mais escuro para variações
    background: '#fefbf3', // Fundo levemente alaranjado
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    border: '#fed7aa', // Borda laranja suave
    accent: '#1e3a8a', // Azul como cor de apoio
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
    background: '#1a0f0a', // Fundo escuro com tom alaranjado
    surface: '#2d1b13', // Superfície escura alaranjada
    text: '#ffffff',
    textSecondary: '#d1d5db',
    border: '#92400e', // Borda laranja escura
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