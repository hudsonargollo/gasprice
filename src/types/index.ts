export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'owner' | 'client';
  createdAt: Date;
  lastLogin: Date | null;
  updatedAt: Date;
}

export interface Client {
  id: string;
  userId?: string; // Link to user account
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  itemsPurchased: number;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MikroTikDevice {
  id: string;
  serialNumber: string;
  model: string;
  macAddress: string;
  clientId?: string;
  deviceName?: string;
  vpnIpAddress?: string;
  vpnUsername?: string;
  vpnPassword?: string;
  adminPassword?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  status: 'configured' | 'shipped' | 'deployed' | 'online' | 'offline' | 'maintenance';
  deploymentDate?: Date;
  lastSeen?: Date;
  locationAddress?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HuiduDevice {
  id: string;
  serialNumber: string;
  model: string;
  macAddress: string;
  clientId?: string;
  deviceName?: string;
  ipAddress?: string;
  adminPassword?: string;
  status: 'configured' | 'shipped' | 'deployed' | 'online' | 'offline' | 'maintenance';
  deploymentDate?: Date;
  lastSeen?: Date;
  locationAddress?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Station {
  id: string;
  ownerId: string;
  clientId?: string;
  mikrotikDeviceId?: string;
  name: string;
  vpnIpAddress: string;
  isOnline: boolean;
  lastSync: Date | null;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  panels: LEDPanel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LEDPanel {
  id: string;
  stationId: string;
  mikrotikDeviceId?: string; // Link to MikroTik device
  huiduDeviceId?: string; // Link to Huidu device
  name: string;
  currentPrices: FuelPrices;
  lastUpdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FuelPrices {
  regular: number;
  premium: number;
  diesel: number;
  [fuelType: string]: number;
}

export interface HuiduCommand {
  header: 0x02;
  command: 0x31;
  length: number;
  data: Buffer;
  checksum: number;
  footer: 0x03;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresIn: string;
  user: Omit<User, 'passwordHash'>;
}

export interface UserSession {
  userId: string;
  username: string;
  role: 'admin' | 'owner' | 'client';
  iat: number;
  exp: number;
}

export interface ConnectionStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  consecutiveFailures: number;
}

export interface StationDetails extends Station {
  connectionStatus: ConnectionStatus;
}

export interface UpdateResult {
  success: boolean;
  panelsUpdated: number;
  errors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PriceUpdateLog {
  id: string;
  stationId: string;
  panelId: string | null;
  userId: string;
  oldPrices: FuelPrices | null;
  newPrices: FuelPrices;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
}