import { MonitoringService, SecurityEvent, PerformanceMetric } from './MonitoringService';
import { logger } from '../utils/logger';

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  }
}));

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    // Get fresh instance for each test
    monitoringService = MonitoringService.getInstance();
    jest.clearAllMocks();
  });

  describe('Security Event Logging', () => {
    it('should log authentication failures with correct severity', () => {
      monitoringService.logAuthenticationFailure(
        'testuser',
        '192.168.1.100',
        'Mozilla/5.0',
        'Invalid password'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Medium severity security event',
        expect.objectContaining({
          eventType: 'SECURITY_EVENT',
          securityEventType: 'authentication_failure',
          severity: 'medium',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0'
        })
      );
    });

    it('should log authorization failures with high severity', () => {
      monitoringService.logAuthorizationFailure(
        'user123',
        '/admin/users',
        'DELETE',
        '192.168.1.100'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'High severity security event',
        expect.objectContaining({
          eventType: 'SECURITY_EVENT',
          securityEventType: 'authorization_failure',
          severity: 'high',
          userId: 'user123',
          ipAddress: '192.168.1.100'
        })
      );
    });

    it('should log malicious input detection', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      monitoringService.logMaliciousInput(
        maliciousInput,
        'price_input',
        'user123',
        '192.168.1.100'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'High severity security event',
        expect.objectContaining({
          eventType: 'SECURITY_EVENT',
          securityEventType: 'malicious_input',
          severity: 'high'
        })
      );
    });

    it('should trigger alerts for critical security events', () => {
      const criticalEvent: SecurityEvent = {
        type: 'data_breach_attempt',
        severity: 'critical',
        userId: 'attacker',
        ipAddress: '192.168.1.100',
        details: { attemptedData: 'user_passwords' },
        timestamp: new Date()
      };

      monitoringService.logSecurityEvent(criticalEvent);

      // Should log both the event and the alert
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        'CRITICAL SECURITY ALERT',
        expect.objectContaining({
          alert: true,
          requiresImmediateAttention: true
        })
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance metrics', () => {
      const metric: PerformanceMetric = {
        operation: 'price_update',
        duration: 1500,
        success: true,
        timestamp: new Date(),
        metadata: { stationId: 'station123' }
      };

      monitoringService.logPerformanceMetric(metric);

      expect(logger.info).toHaveBeenCalledWith(
        'Performance metric recorded',
        expect.objectContaining({
          eventType: 'PERFORMANCE_METRIC',
          operation: 'price_update',
          duration: 1500,
          success: true
        })
      );
    });

    it('should alert on slow operations', () => {
      const slowMetric: PerformanceMetric = {
        operation: 'database_query',
        duration: 6000, // 6 seconds - above threshold
        success: true,
        timestamp: new Date()
      };

      monitoringService.logPerformanceMetric(slowMetric);

      expect(logger.warn).toHaveBeenCalledWith(
        'Slow operation detected',
        expect.objectContaining({
          operation: 'database_query',
          duration: 6000,
          threshold: 5000
        })
      );
    });

    it('should calculate performance analytics correctly', () => {
      // Add some test metrics
      const metrics: PerformanceMetric[] = [
        { operation: 'test_op', duration: 1000, success: true, timestamp: new Date() },
        { operation: 'test_op', duration: 2000, success: true, timestamp: new Date() },
        { operation: 'test_op', duration: 6000, success: false, timestamp: new Date() }, // Slow and failed
        { operation: 'other_op', duration: 500, success: true, timestamp: new Date() }
      ];

      metrics.forEach(metric => monitoringService.logPerformanceMetric(metric));

      const analytics = monitoringService.getPerformanceAnalytics('test_op');

      expect(analytics.totalOperations).toBe(3);
      expect(analytics.averageDuration).toBe(3000); // (1000 + 2000 + 6000) / 3
      expect(analytics.successRate).toBe(2/3); // 2 successful out of 3
      expect(analytics.slowOperations).toBe(1); // 1 operation > 5000ms
    });
  });

  describe('System Health Monitoring', () => {
    it('should log health metrics with appropriate log levels', () => {
      // Healthy component
      monitoringService.logHealthMetric({
        component: 'database',
        status: 'healthy',
        responseTime: 50,
        timestamp: new Date()
      });

      expect(logger.log).toHaveBeenCalledWith(
        'info',
        'System health metric',
        expect.objectContaining({
          eventType: 'HEALTH_METRIC',
          component: 'database',
          status: 'healthy'
        })
      );

      // Degraded component
      monitoringService.logHealthMetric({
        component: 'led_communication',
        status: 'degraded',
        responseTime: 2000,
        timestamp: new Date()
      });

      expect(logger.log).toHaveBeenCalledWith(
        'warn',
        'System health metric',
        expect.objectContaining({
          component: 'led_communication',
          status: 'degraded'
        })
      );

      // Unhealthy component
      monitoringService.logHealthMetric({
        component: 'vpn_monitor',
        status: 'unhealthy',
        timestamp: new Date(),
        details: { error: 'Connection timeout' }
      });

      expect(logger.log).toHaveBeenCalledWith(
        'error',
        'System health metric',
        expect.objectContaining({
          component: 'vpn_monitor',
          status: 'unhealthy'
        })
      );
    });

    it('should provide health summary', () => {
      // Add some health metrics
      monitoringService.logHealthMetric({
        component: 'database',
        status: 'healthy',
        responseTime: 50,
        timestamp: new Date()
      });

      monitoringService.logHealthMetric({
        component: 'api_server',
        status: 'degraded',
        responseTime: 1500,
        timestamp: new Date()
      });

      const summary = monitoringService.getHealthSummary();

      expect(summary.database).toBeDefined();
      expect(summary.database.status).toBe('healthy');
      expect(summary.api_server).toBeDefined();
      expect(summary.api_server.status).toBe('degraded');
    });
  });

  describe('Price Update Audit Logging', () => {
    it('should log price update operations for audit trail', () => {
      const oldPrices = { regular: 3.45, premium: 3.65, diesel: 3.25 };
      const newPrices = { regular: 3.50, premium: 3.70, diesel: 3.30 };

      monitoringService.logPriceUpdateOperation(
        'station123',
        'user456',
        oldPrices,
        newPrices,
        true,
        1200
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Price update operation',
        expect.objectContaining({
          eventType: 'PRICE_UPDATE_AUDIT',
          stationId: 'station123',
          userId: 'user456',
          oldPrices,
          newPrices,
          success: true,
          duration: 1200
        })
      );

      // Should also log as performance metric
      expect(logger.info).toHaveBeenCalledWith(
        'Performance metric recorded',
        expect.objectContaining({
          eventType: 'PERFORMANCE_METRIC',
          operation: 'price_update'
        })
      );
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data in logs', () => {
      const sensitiveInput = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123xyz',
        normalField: 'normal_value'
      };

      monitoringService.logMaliciousInput(
        sensitiveInput,
        'login_form',
        'user123',
        '192.168.1.100'
      );

      const logCall = (logger.error as jest.Mock).mock.calls[0][1];
      expect(logCall.details.sanitizedInput.password).toBe('***');
      expect(logCall.details.sanitizedInput.token).toBe('***');
      expect(logCall.details.sanitizedInput.normalField).toBe('normal_value');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MonitoringService.getInstance();
      const instance2 = MonitoringService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});