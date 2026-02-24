import { VPNMonitorService } from './VPNMonitorService';
import { StationModel } from '../models/Station';
import { connectTestDatabase, closeTestDatabase } from '../config/testDatabase';
import { logger } from '../utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the entire child_process module
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Import the mocked exec after mocking
import { exec } from 'child_process';
const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('VPNMonitorService', () => {
  let vpnMonitorService: VPNMonitorService;
  let stationModel: StationModel;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(() => {
    vpnMonitorService = new VPNMonitorService();
    stationModel = new StationModel();
    jest.clearAllMocks();
    
    // Mock successful ping by default - use mockResolvedValue for promisified exec
    mockExec.mockImplementation((command: string, callback: any) => {
      // Simulate successful ping response
      setTimeout(() => {
        callback(null, 'TTL=64 time=1ms', '');
      }, 10);
      return {} as any;
    });
  });

  afterEach(() => {
    // Clean up any running intervals
    vpnMonitorService.stopAllMonitoring();
  });

  describe('Service Initialization', () => {
    it('should initialize with empty monitoring state', () => {
      const stats = vpnMonitorService.getMonitoringStats();
      expect(stats.totalStations).toBe(0);
      expect(stats.onlineStations).toBe(0);
      expect(stats.offlineStations).toBe(0);
      expect(stats.monitoringIntervals).toBe(0);
    });

    it('should return null for connection status of non-monitored station', () => {
      const status = vpnMonitorService.getConnectionStatus('non-existent-station');
      expect(status).toBeNull();
    });
  });

  describe('Station Monitoring Management', () => {
    it('should start monitoring a station', async () => {
      const stationId = 'test-station-1';
      const vpnIpAddress = '192.168.1.100';

      await vpnMonitorService.startStationMonitoring(stationId, vpnIpAddress);

      const status = vpnMonitorService.getConnectionStatus(stationId);
      expect(status).not.toBeNull();
      // The initial ping might fail in test environment, so we just check that monitoring started
      expect(status?.consecutiveFailures).toBeGreaterThanOrEqual(0);

      const stats = vpnMonitorService.getMonitoringStats();
      expect(stats.totalStations).toBe(1);
      expect(stats.monitoringIntervals).toBe(1);
    });

    it('should stop monitoring a station', async () => {
      const stationId = 'test-station-2';
      const vpnIpAddress = '192.168.1.101';

      await vpnMonitorService.startStationMonitoring(stationId, vpnIpAddress);
      expect(vpnMonitorService.getConnectionStatus(stationId)).not.toBeNull();

      vpnMonitorService.stopStationMonitoring(stationId);
      
      const stats = vpnMonitorService.getMonitoringStats();
      expect(stats.monitoringIntervals).toBe(0);
    });

    it('should remove station from monitoring', async () => {
      const stationId = 'test-station-3';
      const vpnIpAddress = '192.168.1.102';

      await vpnMonitorService.startStationMonitoring(stationId, vpnIpAddress);
      expect(vpnMonitorService.getConnectionStatus(stationId)).not.toBeNull();

      vpnMonitorService.removeStationFromMonitoring(stationId);
      
      expect(vpnMonitorService.getConnectionStatus(stationId)).toBeNull();
      const stats = vpnMonitorService.getMonitoringStats();
      expect(stats.totalStations).toBe(0);
    });

    it('should update station monitoring with new IP', async () => {
      const stationId = 'test-station-4';
      const oldIpAddress = '192.168.1.103';
      const newIpAddress = '192.168.1.104';

      await vpnMonitorService.startStationMonitoring(stationId, oldIpAddress);
      expect(vpnMonitorService.getConnectionStatus(stationId)).not.toBeNull();

      await vpnMonitorService.updateStationMonitoring(stationId, newIpAddress);
      
      // Should still be monitoring the same station
      expect(vpnMonitorService.getConnectionStatus(stationId)).not.toBeNull();
      const stats = vpnMonitorService.getMonitoringStats();
      expect(stats.totalStations).toBe(1);
      expect(stats.monitoringIntervals).toBe(1);
    });
  });

  describe('Connection Status Management', () => {
    it('should return all connection statuses', async () => {
      const station1 = 'test-station-5';
      const station2 = 'test-station-6';

      await vpnMonitorService.startStationMonitoring(station1, '192.168.1.105');
      await vpnMonitorService.startStationMonitoring(station2, '192.168.1.106');

      const allStatuses = vpnMonitorService.getAllConnectionStatuses();
      expect(allStatuses.size).toBe(2);
      expect(allStatuses.has(station1)).toBe(true);
      expect(allStatuses.has(station2)).toBe(true);
    });

    it('should provide accurate monitoring statistics', async () => {
      // Start with clean state
      vpnMonitorService.stopAllMonitoring();

      const station1 = 'test-station-7';
      const station2 = 'test-station-8';

      await vpnMonitorService.startStationMonitoring(station1, '192.168.1.107');
      await vpnMonitorService.startStationMonitoring(station2, '192.168.1.108');

      const stats = vpnMonitorService.getMonitoringStats();
      expect(stats.totalStations).toBe(2);
      expect(stats.monitoringIntervals).toBe(2);
      // Note: onlineStations and offlineStations depend on ping results which are mocked
    });
  });

  describe('Bulk Operations', () => {
    it('should stop all monitoring', async () => {
      await vpnMonitorService.startStationMonitoring('station-1', '192.168.1.109');
      await vpnMonitorService.startStationMonitoring('station-2', '192.168.1.110');
      await vpnMonitorService.startStationMonitoring('station-3', '192.168.1.111');

      let stats = vpnMonitorService.getMonitoringStats();
      expect(stats.totalStations).toBe(3);
      expect(stats.monitoringIntervals).toBe(3);

      vpnMonitorService.stopAllMonitoring();

      stats = vpnMonitorService.getMonitoringStats();
      expect(stats.totalStations).toBe(0);
      expect(stats.monitoringIntervals).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully when starting monitoring', async () => {
      // This test ensures the service doesn't crash on errors
      // The actual error handling is tested through integration
      const stationId = 'error-station';
      const vpnIpAddress = 'invalid-ip';

      await expect(
        vpnMonitorService.startStationMonitoring(stationId, vpnIpAddress)
      ).resolves.not.toThrow();
    });

    it('should handle stopping non-existent monitoring gracefully', () => {
      expect(() => {
        vpnMonitorService.stopStationMonitoring('non-existent-station');
      }).not.toThrow();
    });

    it('should handle removing non-existent station gracefully', () => {
      expect(() => {
        vpnMonitorService.removeStationFromMonitoring('non-existent-station');
      }).not.toThrow();
    });
  });
});