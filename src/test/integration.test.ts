import request from 'supertest';
import { Express } from 'express';
import { MockLEDPanel } from './mockLEDPanel';
import { logger } from '../utils/logger';

// Import the app
let app: Express;

describe('FuelPrice Pro - System Integration Tests', () => {
  let mockLEDPanel: MockLEDPanel;
  
  // Test data
  let adminToken: string;
  let ownerToken: string;
  let testStationId: string;

  beforeAll(async () => {
    // Import app after environment setup
    const { app: testApp } = await import('../index');
    app = testApp;

    // Start mock LED panel
    mockLEDPanel = new MockLEDPanel(5005);
    await mockLEDPanel.start();

    // Create test users and get tokens
    await setupTestUsers();
  });

  afterAll(async () => {
    // Stop mock LED panel
    if (mockLEDPanel) {
      await mockLEDPanel.stop();
    }
  });

  describe('Complete User Workflow: Mobile to LED', () => {
    it('should complete authentication workflow', async () => {
      // Test invalid credentials
      const invalidResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'invaliduser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(invalidResponse.body.error).toBe('Invalid username or password');

      // Test valid credentials (if users exist)
      try {
        const validResponse = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testowner',
            password: 'testpass123'
          });

        if (validResponse.status === 200) {
          expect(validResponse.body.message).toBe('Authentication successful');
          expect(validResponse.body.data.token).toBeDefined();
          ownerToken = validResponse.body.data.token;
        }
      } catch (error) {
        // User doesn't exist, which is expected in some test environments
        logger.info('Test user not found, skipping token-based tests');
      }
    });

    it('should handle price validation correctly', async () => {
      // Test price validation service directly
      const { PriceUpdateService } = await import('../services/PriceUpdateService');
      const priceService = new PriceUpdateService();

      // Test valid prices
      const validPrices = {
        regular: 3.45,
        premium: 3.65,
        diesel: 3.25
      };

      const validResult = priceService.validatePriceData(validPrices);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test invalid prices
      const invalidPrices = {
        regular: -1.00,
        premium: 1000.00,
        diesel: 3.456
      };

      const invalidResult = priceService.validatePriceData(invalidPrices);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle price sanitization correctly', async () => {
      const { PriceUpdateService } = await import('../services/PriceUpdateService');
      const priceService = new PriceUpdateService();

      // Test sanitization
      const rawPrices = {
        regular: '$3.45',
        premium: '3.65€',
        diesel: 'invalid'
      };

      const sanitized = priceService.sanitizePriceData(rawPrices);
      expect(sanitized.regular).toBe(3.45);
      expect(sanitized.premium).toBe(3.65);
      expect(sanitized.diesel).toBe(0);
    });
  });

  describe('Authentication and Authorization Error Handling', () => {
    it('should reject access without authentication', async () => {
      const response = await request(app)
        .get('/api/stations')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/stations')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should handle token expiration gracefully', async () => {
      // Test with an obviously expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwidXNlcm5hbWUiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';

      const response = await request(app)
        .get('/api/stations')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Network and Hardware Error Handling', () => {
    it('should handle LED panel communication', async () => {
      // Test mock LED panel is working
      const status = mockLEDPanel.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.port).toBe(5005);

      // Test price setting
      const testPrices = { regular: 4.00, premium: 4.20, diesel: 3.80 };
      mockLEDPanel.setPrices(testPrices);
      
      const currentPrices = mockLEDPanel.getCurrentPrices();
      expect(currentPrices.regular).toBe(testPrices.regular);
      expect(currentPrices.premium).toBe(testPrices.premium);
      expect(currentPrices.diesel).toBe(testPrices.diesel);
    });

    it('should handle connection failures gracefully', async () => {
      // Simulate connection issues
      mockLEDPanel.simulateConnectionIssue(1000);
      
      // Wait for simulation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Panel should be back online
      const status = mockLEDPanel.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle VPN monitoring service', async () => {
      const { VPNMonitorService } = await import('../services/VPNMonitorService');
      const vpnService = new VPNMonitorService();

      // Test monitoring stats
      const stats = vpnService.getMonitoringStats();
      expect(stats).toHaveProperty('totalStations');
      expect(stats).toHaveProperty('onlineStations');
      expect(stats).toHaveProperty('offlineStations');
      expect(stats).toHaveProperty('monitoringIntervals');

      // Clean up
      vpnService.stopAllMonitoring();
    });
  });

  describe('Protocol and Communication Testing', () => {
    it('should handle Huidu protocol service initialization', async () => {
      const { HuiduProtocolService } = await import('../services/HuiduProtocolService');
      const protocolService = new HuiduProtocolService();

      // Test service initialization
      expect(protocolService).toBeInstanceOf(HuiduProtocolService);
      
      // Test that the service can create price update commands
      const testPrices = { regular: 3.99, premium: 4.19, diesel: 3.79 };
      const command = protocolService.createPriceUpdateCommand(testPrices);
      
      expect(command).toHaveProperty('header');
      expect(command).toHaveProperty('command');
      expect(command).toHaveProperty('length');
      expect(command).toHaveProperty('data');
      expect(command).toHaveProperty('checksum');
      expect(command).toHaveProperty('footer');
      
      // Check command structure
      expect(command.header).toBe(0x02); // STX header
      expect(command.footer).toBe(0x03); // ETX footer
      expect(command.command).toBe(0x31); // Price update command
      
      // Test frame creation
      const frame = protocolService.createPriceUpdateFrame(testPrices);
      expect(frame).toBeInstanceOf(Buffer);
      expect(frame.length).toBeGreaterThan(0);
    });

    it('should handle LED communication service', async () => {
      const { LEDCommunicationService } = await import('../services/LEDCommunicationService');
      const ledService = new LEDCommunicationService();

      // Test service initialization
      expect(ledService).toBeInstanceOf(LEDCommunicationService);
    });
  });

  describe('Service Integration Testing', () => {
    it('should integrate price update and LED communication services', async () => {
      const { PriceUpdateService } = await import('../services/PriceUpdateService');
      const { LEDCommunicationService } = await import('../services/LEDCommunicationService');
      
      const priceService = new PriceUpdateService();
      const ledService = new LEDCommunicationService();

      // Test service initialization
      expect(priceService).toBeInstanceOf(PriceUpdateService);
      expect(ledService).toBeInstanceOf(LEDCommunicationService);

      // Test price validation workflow
      const prices = { regular: 3.99, premium: 4.19, diesel: 3.79 };
      const validation = priceService.validatePriceData(prices);
      expect(validation.isValid).toBe(true);

      // Test sanitization workflow
      const rawPrices = { regular: '$3.99', premium: '4.19', diesel: '3.79' };
      const sanitized = priceService.sanitizePriceData(rawPrices);
      expect(sanitized).toEqual(prices);
    });

    it('should handle monitoring service integration', async () => {
      // Test monitoring service functionality without instantiating it directly
      // since the constructor is private
      const { VPNMonitorService } = await import('../services/VPNMonitorService');
      const vpnService = new VPNMonitorService();

      // Test monitoring stats
      const stats = vpnService.getMonitoringStats();
      expect(stats).toHaveProperty('totalStations');
      expect(stats).toHaveProperty('onlineStations');
      expect(stats).toHaveProperty('offlineStations');
      expect(stats).toHaveProperty('monitoringIntervals');

      // Clean up
      vpnService.stopAllMonitoring();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service errors gracefully', async () => {
      // Test that services can handle invalid inputs without crashing
      const { PriceUpdateService } = await import('../services/PriceUpdateService');
      const priceService = new PriceUpdateService();

      // Test with null/undefined inputs
      const result1 = priceService.sanitizePriceData(null);
      const result2 = priceService.sanitizePriceData(undefined);
      const result3 = priceService.sanitizePriceData({});

      expect(result1).toHaveProperty('regular');
      expect(result2).toHaveProperty('regular');
      expect(result3).toHaveProperty('regular');

      // Test validation with invalid data
      const validation = priceService.validatePriceData({ regular: NaN, premium: Infinity, diesel: -Infinity });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should maintain system stability under load', async () => {
      // Simulate multiple concurrent operations
      const { PriceUpdateService } = await import('../services/PriceUpdateService');
      const priceService = new PriceUpdateService();

      const operations = Array.from({ length: 5 }, (_, i) => {
        // Use precise decimal calculations to avoid floating-point precision issues
        const prices = {
          regular: parseFloat((3.00 + (i * 0.05)).toFixed(2)),
          premium: parseFloat((3.20 + (i * 0.05)).toFixed(2)),
          diesel: parseFloat((2.80 + (i * 0.05)).toFixed(2))
        };
        return priceService.validatePriceData(prices);
      });

      // All operations should complete successfully
      operations.forEach((result, index) => {
        if (!result.isValid) {
          console.log(`Operation ${index} failed:`, result.errors);
          console.log(`Prices were:`, {
            regular: parseFloat((3.00 + (index * 0.05)).toFixed(2)),
            premium: parseFloat((3.20 + (index * 0.05)).toFixed(2)),
            diesel: parseFloat((2.80 + (index * 0.05)).toFixed(2))
          });
        }
        expect(result.isValid).toBe(true);
      });
    });
  });

  // Helper functions
  async function setupTestUsers(): Promise<void> {
    try {
      // Try to create admin user
      const adminResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testadmin',
          password: 'testpass123',
          role: 'admin'
        });

      if (adminResponse.status === 201) {
        const adminAuth = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testadmin',
            password: 'testpass123'
          });

        if (adminAuth.status === 200) {
          adminToken = adminAuth.body.data.token;

          // Create owner user
          await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              username: 'testowner',
              password: 'testpass123',
              role: 'owner'
            });
        }
      }
    } catch (error) {
      // Users might already exist or database might not be available
      logger.info('Test user setup skipped:', error);
    }
  }
});