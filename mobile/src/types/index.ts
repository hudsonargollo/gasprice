// User and Authentication Types
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'owner' | 'client';
  createdAt: string;
  lastLogin: string | null;
}

export interface AuthToken {
  token: string;
  expiresIn: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Station and Panel Types
export interface FuelPrices {
  regular: number;
  premium: number;
  diesel: number;
  [fuelType: string]: number;
}

export interface LEDPanel {
  id: string;
  stationId: string;
  name: string;
  currentPrices: FuelPrices;
  lastUpdate: string | null;
}

export interface Station {
  id: string;
  ownerId: string;
  name: string;
  vpnIpAddress: string;
  isOnline: boolean;
  lastSync: string | null;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  panels: LEDPanel[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface PriceUpdateResponse {
  success: boolean;
  message: string;
  panelsUpdated: number;
  errors?: string[];
}

export interface ValidationResponse {
  success: boolean;
  sanitizedPrices: FuelPrices;
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  StationDetail: { stationId: string };
  PriceEditor: { stationId: string };
  FactoryProvisioning: undefined;
};

// Redux Store Types
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface StationState {
  stations: Station[];
  selectedStation: Station | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface RootState {
  auth: AuthState;
  stations: StationState;
}

// Component Props Types
export interface StationCardProps {
  station: Station;
  onPress: (stationId: string) => void;
}

export interface PriceInputProps {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  error?: string;
}

export interface LoadingButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    error: string;
    success: string;
    warning: string;
    border: string;
    accent: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
    };
    body: {
      fontSize: number;
      fontWeight: string;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
    };
  };
}

// Network and Error Types
export interface NetworkError {
  message: string;
  status?: number;
  code?: string;
}

export interface AppError {
  message: string;
  type: 'network' | 'validation' | 'auth' | 'unknown';
  details?: any;
}