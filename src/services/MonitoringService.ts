import { logger } from '../utils/logger';
import { FuelPrices } from '../types';

/**
 * Monitoring and Security Event Logging Service
 * Requirements: 5.3, 7.5, 12.2
 * 
 * Provides comprehensive logging and monitoring capabilities including:
 * - Security event logging
 * - Performance monitoring
 * - System health checks
 * - Audit trail logging
 */

export interface SecurityEvent {
  type: 'authentication_failure' | 'authorization_failure' | 'malicious_input' | 'suspicious_activity' | 'data_breach_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: any;
  timestamp: Date;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: any;
}

export interface SystemHealthMetric {
  component: 'database' | 'led_communication' | 'vpn_monitor' | 'api_server';
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  errorRate?: number;
  timestamp: Date;
  details?: any;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private performanceMetrics: PerformanceMetric[] = [];
  private healthMetrics: SystemHealthMetric[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

  private constructor() {
    // Start periodic health checks
    this.startHealthChecks();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Log security events with appropriate severity levels
   * Requirements: 7.5
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logData = {
      eventType: 'SECURITY_EVENT',
      securityEventType: event.type,
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: event.timestamp.toISOString()
    };

    // Log with appropriate level based on severity
    switch (event.severity) {
      case 'critical':
        logger.error('Critical security event detected', logData);
        break;
      case 'high':
        logger.error('High severity security event', logData);
        break;
      case 'medium':
        logger.warn('Medium severity security event', logData);
        break;
      case 'low':
        logger.info('Low severity security event', logData);
        break;
    }

    // For critical events, also trigger immediate alerts
    if (event.severity === 'critical') {
      this.triggerSecurityAlert(event);
    }
  }

  /**
   * Log authentication failures
   */
  logAuthenticationFailure(username: string, ipAddress: string, userAgent?: string, reason?: string): void {
    this.logSecurityEvent({
      type: 'authentication_failure',
      severity: 'medium',
      ipAddress,
      userAgent,
      details: {
        username,
        reason: reason || 'Invalid credentials',
        attemptTime: new Date().toISOString()
      },
      timestamp: new Date()
    });
  }

  /**
   * Log authorization failures
   */
  logAuthorizationFailure(userId: string, resource: string, action: string, ipAddress: string): void {
    this.logSecurityEvent({
      type: 'authorization_failure',
      severity: 'high',
      userId,
      ipAddress,
      details: {
        resource,
        action,
        message: 'Access denied to protected resource'
      },
      timestamp: new Date()
    });
  }

  /**
   * Log malicious input detection
   */
  logMaliciousInput(input: any, inputType: string, userId?: string, ipAddress?: string): void {
    this.logSecurityEvent({
      type: 'malicious_input',
      severity: 'high',
      userId,
      ipAddress,
      details: {
        inputType,
        sanitizedInput: this.sanitizeForLogging(input),
        detectionReason: 'Input contains potentially malicious content'
      },
      timestamp: new Date()
    });
  }

  /**
   * Log performance metrics
   * Requirements: 5.3
   */
  logPerformanceMetric(metric: PerformanceMetric): void {
    // Add to in-memory store for analysis
    this.performanceMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS_HISTORY);
    }

    // Log performance data
    logger.info('Performance metric recorded', {
      eventType: 'PERFORMANCE_METRIC',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      timestamp: metric.timestamp.toISOString(),
      metadata: metric.metadata
    });

    // Alert on slow operations
    if (metric.duration > 5000) { // 5 seconds
      logger.warn('Slow operation detected', {
        operation: metric.operation,
        duration: metric.duration,
        threshold: 5000
      });
    }
  }

  /**
   * Log system health metrics
   */
  logHealthMetric(metric: SystemHealthMetric): void {
    this.healthMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.healthMetrics.length > this.MAX_METRICS_HISTORY) {
      this.healthMetrics = this.healthMetrics.slice(-this.MAX_METRICS_HISTORY);
    }

    const logLevel = metric.status === 'healthy' ? 'info' : 
                    metric.status === 'degraded' ? 'warn' : 'error';

    logger.log(logLevel, 'System health metric', {
      eventType: 'HEALTH_METRIC',
      component: metric.component,
      status: metric.status,
      responseTime: metric.responseTime,
      errorRate: metric.errorRate,
      timestamp: metric.timestamp.toISOString(),
      details: metric.details
    });
  }

  /**
   * Log price update operations for audit trail
   * Requirements: 5.3
   */
  logPriceUpdateOperation(
    stationId: string,
    userId: string,
    oldPrices: FuelPrices | null,
    newPrices: FuelPrices,
    success: boolean,
    duration: number,
    errorMessage?: string
  ): void {
    logger.info('Price update operation', {
      eventType: 'PRICE_UPDATE_AUDIT',
      stationId,
      userId,
      oldPrices,
      newPrices,
      success,
      duration,
      errorMessage,
      timestamp: new Date().toISOString()
    });

    // Also log as performance metric
    this.logPerformanceMetric({
      operation: 'price_update',
      duration,
      success,
      timestamp: new Date(),
      metadata: {
        stationId,
        userId,
        priceCount: Object.keys(newPrices).length
      }
    });
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(operation?: string): {
    averageDuration: number;
    successRate: number;
    totalOperations: number;
    slowOperations: number;
  } {
    const metrics = operation 
      ? this.performanceMetrics.filter(m => m.operation === operation)
      : this.performanceMetrics;

    if (metrics.length === 0) {
      return {
        averageDuration: 0,
        successRate: 0,
        totalOperations: 0,
        slowOperations: 0
      };
    }

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const successfulOperations = metrics.filter(m => m.success).length;
    const slowOperations = metrics.filter(m => m.duration > 5000).length;

    return {
      averageDuration: totalDuration / metrics.length,
      successRate: successfulOperations / metrics.length,
      totalOperations: metrics.length,
      slowOperations
    };
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): { [component: string]: SystemHealthMetric } {
    const summary: { [component: string]: SystemHealthMetric } = {};
    
    // Get latest metric for each component
    const components = ['database', 'led_communication', 'vpn_monitor', 'api_server'] as const;
    
    for (const component of components) {
      const componentMetrics = this.healthMetrics
        .filter(m => m.component === component)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      if (componentMetrics.length > 0) {
        summary[component] = componentMetrics[0];
      }
    }

    return summary;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Check system health every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    // Initial health check
    setTimeout(() => this.performHealthChecks(), 1000);
  }

  /**
   * Perform health checks on all components
   */
  private async performHealthChecks(): Promise<void> {
    // Database health check
    try {
      const startTime = Date.now();
      // This would normally check database connectivity
      // For now, we'll simulate a health check
      const responseTime = Date.now() - startTime;
      
      this.logHealthMetric({
        component: 'database',
        status: 'healthy',
        responseTime,
        timestamp: new Date()
      });
    } catch (error) {
      this.logHealthMetric({
        component: 'database',
        status: 'unhealthy',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    // API server health check
    this.logHealthMetric({
      component: 'api_server',
      status: 'healthy',
      timestamp: new Date(),
      details: { uptime: process.uptime() }
    });
  }

  /**
   * Trigger security alert for critical events
   */
  private triggerSecurityAlert(event: SecurityEvent): void {
    // In a real implementation, this would:
    // - Send notifications to security team
    // - Trigger automated responses
    // - Update security dashboards
    
    logger.error('CRITICAL SECURITY ALERT', {
      alert: true,
      event,
      timestamp: new Date().toISOString(),
      requiresImmediateAttention: true
    });
  }

  /**
   * Sanitize sensitive data for logging
   */
  private sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      // Remove potential sensitive patterns
      return data
        .replace(/password[^&\s]*/gi, 'password=***')
        .replace(/token[^&\s]*/gi, 'token=***')
        .replace(/key[^&\s]*/gi, 'key=***')
        .substring(0, 500); // Limit length
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (['password', 'token', 'key', 'secret'].some(sensitive => 
          key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = typeof value === 'string' ? 
            value.substring(0, 200) : value;
        }
      }
      return sanitized;
    }
    
    return data;
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();