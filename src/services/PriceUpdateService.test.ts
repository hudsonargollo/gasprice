import { PriceUpdateService } from './PriceUpdateService';
import { FuelPrices } from '../types';
import { getPool } from '../config/database';

// Mock the database pool
jest.mock('../config/database', () => ({
  getPool: jest.fn()
}));

// Mock the LEDCommunicationService
jest.mock('./LEDCommunicationService', () => ({
  LEDCommunicationService: jest.fn().mockImplementation(() => ({
    sendPriceUpdate: jest.fn()
  }))
}));

// Mock the StationService
jest.mock('./StationService', () => ({
  StationService: jest.fn().mockImplementation(() => ({
    getStationById: jest.fn()
  }))
}));

describe('PriceUpdateService', () => {
  let priceUpdateService: PriceUpdateService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    priceUpdateService = new PriceUpdateService();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    // Mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };
    
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePriceData', () => {
    it('should validate correct price data', () => {
      const validPrices: FuelPrices = {
        regular: 3.45,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(validPrices);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative prices', () => {
      const invalidPrices: FuelPrices = {
        regular: -1.50,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(invalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('regular price must be positive (greater than 0)');
    });

    it('should reject zero prices', () => {
      const invalidPrices: FuelPrices = {
        regular: 0,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(invalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('regular price must be positive (greater than 0)');
    });

    it('should reject prices below minimum range', () => {
      const invalidPrices: FuelPrices = {
        regular: 0.005,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(invalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('regular price must be between 0.01 and 999.99');
    });

    it('should reject prices above maximum range', () => {
      const invalidPrices: FuelPrices = {
        regular: 1000.00,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(invalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('regular price must be between 0.01 and 999.99');
    });

    it('should reject prices with too many decimal places', () => {
      const invalidPrices: FuelPrices = {
        regular: 3.456,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(invalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('regular price cannot have more than 2 decimal places');
    });

    it('should reject non-numeric values', () => {
      const invalidPrices: any = {
        regular: 'not a number',
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(invalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('regular price must be a valid number');
    });

    it('should reject NaN values', () => {
      const invalidPrices: FuelPrices = {
        regular: NaN,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.validatePriceData(invalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('regular price must be a valid number');
    });

    it('should validate additional fuel types', () => {
      const validPrices: FuelPrices = {
        regular: 3.45,
        premium: 3.65,
        diesel: 3.25,
        ethanol: 2.95
      };

      const result = priceUpdateService.validatePriceData(validPrices);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('sanitizePriceData', () => {
    it('should sanitize valid numeric strings', () => {
      const rawPrices = {
        regular: '3.45',
        premium: '3.65',
        diesel: '3.25'
      };

      const result = priceUpdateService.sanitizePriceData(rawPrices);

      expect(result.regular).toBe(3.45);
      expect(result.premium).toBe(3.65);
      expect(result.diesel).toBe(3.25);
    });

    it('should sanitize strings with non-numeric characters', () => {
      const rawPrices = {
        regular: '$3.45',
        premium: '3.65€',
        diesel: 'USD 3.25'
      };

      const result = priceUpdateService.sanitizePriceData(rawPrices);

      expect(result.regular).toBe(3.45);
      expect(result.premium).toBe(3.65);
      expect(result.diesel).toBe(3.25);
    });

    it('should handle numeric values directly', () => {
      const rawPrices = {
        regular: 3.45,
        premium: 3.65,
        diesel: 3.25
      };

      const result = priceUpdateService.sanitizePriceData(rawPrices);

      expect(result.regular).toBe(3.45);
      expect(result.premium).toBe(3.65);
      expect(result.diesel).toBe(3.25);
    });

    it('should set invalid values to 0', () => {
      const rawPrices = {
        regular: 'invalid',
        premium: null,
        diesel: undefined
      };

      const result = priceUpdateService.sanitizePriceData(rawPrices);

      expect(result.regular).toBe(0);
      expect(result.premium).toBe(0);
      expect(result.diesel).toBe(0);
    });

    it('should sanitize additional fuel type names', () => {
      const rawPrices = {
        regular: 3.45,
        'premium-plus!@#': 3.85,
        'diesel_special': 3.35,
        'invalid-name-that-is-too-long-to-be-accepted': 4.00
      };

      const result = priceUpdateService.sanitizePriceData(rawPrices);

      expect(result.regular).toBe(3.45);
      expect(result.premiumplus).toBe(3.85);
      expect(result.diesel_special).toBe(3.35);
      expect(result).not.toHaveProperty('invalid-name-that-is-too-long-to-be-accepted');
    });

    it('should handle empty or null input', () => {
      const result1 = priceUpdateService.sanitizePriceData(null);
      const result2 = priceUpdateService.sanitizePriceData(undefined);
      const result3 = priceUpdateService.sanitizePriceData({});

      expect(result1.regular).toBe(0);
      expect(result1.premium).toBe(0);
      expect(result1.diesel).toBe(0);

      expect(result2.regular).toBe(0);
      expect(result2.premium).toBe(0);
      expect(result2.diesel).toBe(0);

      expect(result3.regular).toBe(0);
      expect(result3.premium).toBe(0);
      expect(result3.diesel).toBe(0);
    });
  });

  describe('integration tests', () => {
    it('should sanitize and validate in sequence', () => {
      const rawPrices = {
        regular: '$3.45',
        premium: '3.65',
        diesel: 'invalid'
      };

      const sanitized = priceUpdateService.sanitizePriceData(rawPrices);
      const validation = priceUpdateService.validatePriceData(sanitized);

      expect(sanitized.regular).toBe(3.45);
      expect(sanitized.premium).toBe(3.65);
      expect(sanitized.diesel).toBe(0);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('diesel price must be positive (greater than 0)');
    });

    it('should handle edge case prices at boundaries', () => {
      const rawPrices = {
        regular: '0.01',
        premium: '999.99',
        diesel: '1.00'
      };

      const sanitized = priceUpdateService.sanitizePriceData(rawPrices);
      const validation = priceUpdateService.validatePriceData(sanitized);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});