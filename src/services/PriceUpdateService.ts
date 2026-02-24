import { FuelPrices, ValidationResult, UpdateResult, PriceUpdateLog } from '../types';
import { logger } from '../utils/logger';
import { LEDCommunicationService } from './LEDCommunicationService';
import { StationService } from './StationService';
import { getPool } from '../config/database';
import { monitoringService } from './MonitoringService';

export class PriceUpdateService {
  private ledCommunicationService: LEDCommunicationService;
  private stationService: StationService;

  constructor() {
    this.ledCommunicationService = new LEDCommunicationService();
    this.stationService = new StationService();
  }

  /**
   * Validates price data according to requirements 3.2 and 7.3
   * Ensures values are positive numbers within range 0.01 to 999.99
   */
  validatePriceData(prices: FuelPrices): ValidationResult {
    const errors: string[] = [];
    const MIN_PRICE = 0.01;
    const MAX_PRICE = 999.99;

    // Check each fuel type price
    for (const [fuelType, price] of Object.entries(prices)) {
      // Sanitize input - ensure it's a number
      if (typeof price !== 'number' || isNaN(price)) {
        errors.push(`${fuelType} price must be a valid number`);
        continue;
      }

      // Check if price is positive
      if (price <= 0) {
        errors.push(`${fuelType} price must be positive (greater than 0)`);
        continue;
      }

      // Check price range
      if (price < MIN_PRICE || price > MAX_PRICE) {
        errors.push(`${fuelType} price must be between ${MIN_PRICE} and ${MAX_PRICE}`);
        continue;
      }

      // Check decimal precision (max 2 decimal places)
      const decimalPlaces = (price.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        errors.push(`${fuelType} price cannot have more than 2 decimal places`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitizes price input data to prevent buffer overflow and invalid characters
   * Requirements: 7.1
   */
  sanitizePriceData(rawPrices: any): FuelPrices {
    const sanitized: FuelPrices = {
      regular: 0,
      premium: 0,
      diesel: 0
    };

    // Define allowed fuel types to prevent injection
    const allowedFuelTypes = ['regular', 'premium', 'diesel'];

    for (const fuelType of allowedFuelTypes) {
      if (rawPrices && typeof rawPrices[fuelType] !== 'undefined') {
        // Convert to number and sanitize
        const rawValue = rawPrices[fuelType];
        
        if (typeof rawValue === 'string') {
          // Remove any non-numeric characters except decimal point
          const cleanValue = rawValue.replace(/[^0-9.]/g, '');
          const numericValue = parseFloat(cleanValue);
          sanitized[fuelType] = isNaN(numericValue) ? 0 : numericValue;
        } else if (typeof rawValue === 'number') {
          sanitized[fuelType] = isNaN(rawValue) ? 0 : rawValue;
        }
      }
    }

    // Handle additional fuel types if present (but sanitize them)
    if (rawPrices && typeof rawPrices === 'object') {
      for (const [key, value] of Object.entries(rawPrices)) {
        if (!allowedFuelTypes.includes(key) && typeof key === 'string') {
          // Sanitize fuel type name - only allow alphanumeric and underscore
          const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
          if (sanitizedKey.length > 0 && sanitizedKey.length <= 20) {
            if (typeof value === 'string') {
              const cleanValue = value.replace(/[^0-9.]/g, '');
              const numericValue = parseFloat(cleanValue);
              if (!isNaN(numericValue)) {
                sanitized[sanitizedKey] = numericValue;
              }
            } else if (typeof value === 'number' && !isNaN(value)) {
              sanitized[sanitizedKey] = value;
            }
          }
        }
      }
    }

    return sanitized;
  }

  /**
   * Updates prices for a station with validation and sanitization
   * Requirements: 3.2, 7.1, 7.3
   */
  async updatePrices(stationId: string, rawPrices: any, userId: string): Promise<UpdateResult> {
    const startTime = Date.now();
    let oldPrices: FuelPrices | null = null;
    
    try {
      // Sanitize input data first
      const sanitizedPrices = this.sanitizePriceData(rawPrices);
      
      // Check for potentially malicious input
      if (this.detectMaliciousInput(rawPrices)) {
        monitoringService.logMaliciousInput(rawPrices, 'price_update', userId);
      }
      
      // Validate sanitized prices
      const validation = this.validatePriceData(sanitizedPrices);
      if (!validation.isValid) {
        logger.warn('Price validation failed', { 
          stationId, 
          userId, 
          errors: validation.errors 
        });
        
        const duration = Date.now() - startTime;
        monitoringService.logPriceUpdateOperation(
          stationId, userId, null, sanitizedPrices, false, duration, 
          `Validation failed: ${validation.errors.join(', ')}`
        );
        
        return {
          success: false,
          panelsUpdated: 0,
          errors: validation.errors
        };
      }

      // Get station details to verify ownership and get panels
      const station = await this.stationService.getStationByIdInternal(stationId);
      if (!station) {
        const duration = Date.now() - startTime;
        monitoringService.logPriceUpdateOperation(
          stationId, userId, null, sanitizedPrices, false, duration, 'Station not found'
        );
        
        return {
          success: false,
          panelsUpdated: 0,
          errors: ['Station not found']
        };
      }

      // Store old prices for audit logging
      if (station.panels.length > 0) {
        oldPrices = station.panels[0].currentPrices;
      }

      // Update prices for all panels at the station
      const updateResults: boolean[] = [];
      const errors: string[] = [];

      for (const panel of station.panels) {
        try {
          // Send price update to LED panel
          const result = await this.ledCommunicationService.sendPriceUpdate(
            station.vpnIpAddress,
            sanitizedPrices,
            panel.id
          );

          updateResults.push(result.success);

          if (result.success) {
            // Update panel prices in database
            await this.updatePanelPrices(panel.id, sanitizedPrices);
            
            // Log successful update
            await this.logPriceUpdate(stationId, panel.id, userId, panel.currentPrices, sanitizedPrices, true, null);
            
            logger.info('Price update successful', {
              stationId,
              panelId: panel.id,
              userId,
              prices: sanitizedPrices
            });
          } else {
            errors.push(`Failed to update panel ${panel.name}: ${result.error || 'Unknown error'}`);
            
            // Log failed update
            await this.logPriceUpdate(stationId, panel.id, userId, panel.currentPrices, sanitizedPrices, false, result.error || 'LED communication failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error updating panel ${panel.name}: ${errorMessage}`);
          updateResults.push(false);
          
          // Log failed update
          await this.logPriceUpdate(stationId, panel.id, userId, panel.currentPrices, sanitizedPrices, false, errorMessage);
          
          logger.error('Price update error', {
            stationId,
            panelId: panel.id,
            userId,
            error: errorMessage
          });
        }
      }

      const successfulUpdates = updateResults.filter(result => result).length;
      const success = successfulUpdates > 0;
      const duration = Date.now() - startTime;

      // Log the overall operation for monitoring
      monitoringService.logPriceUpdateOperation(
        stationId, userId, oldPrices, sanitizedPrices, success, duration,
        errors.length > 0 ? errors.join('; ') : undefined
      );

      return {
        success,
        panelsUpdated: successfulUpdates,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;
      
      logger.error('Price update service error', { stationId, userId, error: errorMessage });
      
      monitoringService.logPriceUpdateOperation(
        stationId, userId, oldPrices, {regular: 0, premium: 0, diesel: 0}, false, duration, errorMessage
      );
      
      return {
        success: false,
        panelsUpdated: 0,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Updates panel prices in the database
   */
  private async updatePanelPrices(panelId: string, prices: FuelPrices): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE led_panels 
         SET current_prices = $1, last_update = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(prices), panelId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Logs price update attempts for audit trail
   * Requirements: 5.3
   */
  private async logPriceUpdate(
    stationId: string,
    panelId: string,
    userId: string,
    oldPrices: FuelPrices | null,
    newPrices: FuelPrices,
    success: boolean,
    errorMessage: string | null
  ): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO price_update_logs 
         (station_id, panel_id, user_id, old_prices, new_prices, success, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          stationId,
          panelId,
          userId,
          oldPrices ? JSON.stringify(oldPrices) : null,
          JSON.stringify(newPrices),
          success,
          errorMessage
        ]
      );
    } catch (error) {
      logger.error('Failed to log price update', { error });
    } finally {
      client.release();
    }
  }

  /**
   * Detect potentially malicious input patterns
   * Requirements: 7.5
   */
  private detectMaliciousInput(input: any): boolean {
    if (typeof input === 'string') {
      const maliciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /DROP\s+TABLE/gi,
        /SELECT.*FROM/gi,
        /INSERT\s+INTO/gi,
        /DELETE\s+FROM/gi,
        /UNION\s+SELECT/gi,
        /\.\.\//g,
        /\${.*}/g,
        /%[0-9a-f]{2}/gi // URL encoded characters
      ];

      return maliciousPatterns.some(pattern => pattern.test(input));
    }

    if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(value => this.detectMaliciousInput(value));
    }

    return false;
  }
}