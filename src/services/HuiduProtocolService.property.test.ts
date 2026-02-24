import * as fc from 'fast-check';
import { HuiduProtocolService } from './HuiduProtocolService';
import { FuelPrices } from '../types';

/**
 * Property-Based Tests for HuiduProtocolService
 * Feature: fuel-price-management
 * 
 * These tests validate universal correctness properties for the Huidu protocol
 * implementation using the fast-check library with 100+ iterations per test.
 */

describe('HuiduProtocolService Property-Based Tests', () => {
  let huiduService: HuiduProtocolService;

  beforeEach(() => {
    huiduService = new HuiduProtocolService();
  });

  /**
   * Property 5: Huidu Protocol Compliance
   * For any price update command, the generated protocol frame should have 
   * header 0x02, footer 0x03, UTF-8 encoded data, and a valid CRC16-CCITT checksum,
   * transmitted over TCP port 5005.
   * Validates: Requirements 3.4, 4.1, 4.3, 4.4, 4.5
   */
  describe('Property 5: Huidu Protocol Compliance', () => {
    it('should generate valid protocol frames for any price data', () => {
      fc.assert(
        fc.property(
          fc.record({
            regular: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            premium: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            diesel: fc.double({ min: 0.01, max: 999.99, noNaN: true })
          }),
          fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          (prices: FuelPrices, panelId: string | null) => {
            // Property: frame generation should never throw
            expect(() => {
              const frame = huiduService.createPriceUpdateFrame(prices, panelId || undefined);
              
              // Property: frame should have correct header (STX = 0x02)
              expect(frame.readUInt8(0)).toBe(0x02);
              
              // Property: frame should have correct footer (ETX = 0x03)
              expect(frame.readUInt8(frame.length - 1)).toBe(0x03);
              
              // Property: frame should have minimum required length
              expect(frame.length).toBeGreaterThanOrEqual(7); // STX + CMD + LEN + CRC + ETX minimum
              
              // Property: command should be price update command (0x10 or 0x31)
              const command = frame.readUInt8(1);
              expect([0x10, 0x31]).toContain(command);
              
              // Property: data length should match actual data
              const dataLength = frame.readUInt16BE(2);
              const expectedFrameLength = 1 + 1 + 2 + dataLength + 2 + 1;
              expect(frame.length).toBe(expectedFrameLength);
              
              // Property: frame should be valid when validated
              const validation = huiduService.validateFrame(frame);
              expect(validation.isValid).toBe(true);
              
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate frames with valid CRC checksums', () => {
      fc.assert(
        fc.property(
          fc.record({
            regular: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            premium: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            diesel: fc.double({ min: 0.01, max: 999.99, noNaN: true })
          }),
          (prices: FuelPrices) => {
            const frame = huiduService.createPriceUpdateFrame(prices);
            
            // Property: CRC validation should always pass for generated frames
            const validation = huiduService.validateFrame(frame);
            expect(validation.isValid).toBe(true);
            expect(validation.error).toBeUndefined();
            
            // Property: parsing should succeed for valid frames
            const parsed = huiduService.parseFrame(frame);
            expect(parsed).not.toBeNull();
            expect(parsed?.command).toBeDefined();
            expect(parsed?.data).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle frame validation consistently', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          (randomData: Uint8Array) => {
            const buffer = Buffer.from(randomData);
            
            // Property: validation should never throw
            expect(() => {
              const validation = huiduService.validateFrame(buffer);
              
              // Property: validation result should have consistent structure
              expect(typeof validation.isValid).toBe('boolean');
              if (!validation.isValid) {
                expect(typeof validation.error).toBe('string');
                expect(validation.error!.length).toBeGreaterThan(0);
              }
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Frame Structure Consistency
   * All generated frames should follow the same structural pattern
   */
  describe('Frame Structure Consistency', () => {
    it('should maintain consistent frame structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            regular: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            premium: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            diesel: fc.double({ min: 0.01, max: 999.99, noNaN: true })
          }),
          (prices: FuelPrices) => {
            const frame1 = huiduService.createPriceUpdateFrame(prices);
            const frame2 = huiduService.createPriceUpdateFrame(prices);
            
            // Property: frames for same data should have same structure
            expect(frame1.readUInt8(0)).toBe(frame2.readUInt8(0)); // Same STX
            expect(frame1.readUInt8(1)).toBe(frame2.readUInt8(1)); // Same command
            expect(frame1.readUInt16BE(2)).toBe(frame2.readUInt16BE(2)); // Same data length
            expect(frame1.readUInt8(frame1.length - 1)).toBe(frame2.readUInt8(frame2.length - 1)); // Same ETX
            
            // Property: both frames should be valid
            expect(huiduService.validateFrame(frame1).isValid).toBe(true);
            expect(huiduService.validateFrame(frame2).isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Data Encoding Consistency
   * Price data should be consistently encoded in UTF-8 JSON format
   */
  describe('Data Encoding Consistency', () => {
    it('should encode price data as valid UTF-8 JSON', () => {
      fc.assert(
        fc.property(
          fc.record({
            regular: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            premium: fc.double({ min: 0.01, max: 999.99, noNaN: true }),
            diesel: fc.double({ min: 0.01, max: 999.99, noNaN: true })
          }),
          (prices: FuelPrices) => {
            const frame = huiduService.createPriceUpdateFrame(prices);
            const parsed = huiduService.parseFrame(frame);
            
            expect(parsed).not.toBeNull();
            
            // Property: data should be valid UTF-8 JSON
            expect(() => {
              const dataString = parsed!.data.toString('utf-8');
              const parsedData = JSON.parse(dataString);
              
              // Property: parsed data should contain price information
              expect(parsedData).toHaveProperty('prices');
              expect(parsedData.prices).toHaveProperty('regular');
              expect(parsedData.prices).toHaveProperty('premium');
              expect(parsedData.prices).toHaveProperty('diesel');
              
              // Property: prices should be strings (as stored in JSON)
              expect(typeof parsedData.prices.regular).toBe('string');
              expect(typeof parsedData.prices.premium).toBe('string');
              expect(typeof parsedData.prices.diesel).toBe('string');
              
              // Property: string prices should be convertible to numbers
              expect(Number.isFinite(parseFloat(parsedData.prices.regular))).toBe(true);
              expect(Number.isFinite(parseFloat(parsedData.prices.premium))).toBe(true);
              expect(Number.isFinite(parseFloat(parsedData.prices.diesel))).toBe(true);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: ACK Frame Consistency
   * ACK frames should always be valid and consistent
   */
  describe('ACK Frame Consistency', () => {
    it('should generate consistent ACK frames', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (iterations: number) => {
            const frames: Buffer[] = [];
            
            // Generate multiple ACK frames
            for (let i = 0; i < iterations; i++) {
              frames.push(huiduService.createAckFrame());
            }
            
            // Property: all ACK frames should be identical
            for (let i = 1; i < frames.length; i++) {
              expect(frames[i].equals(frames[0])).toBe(true);
            }
            
            // Property: all ACK frames should be valid
            frames.forEach(frame => {
              const validation = huiduService.validateFrame(frame);
              expect(validation.isValid).toBe(true);
              
              // Property: ACK frames should have expected structure
              expect(frame.readUInt8(0)).toBe(0x02); // STX
              expect(frame.readUInt8(frame.length - 1)).toBe(0x03); // ETX
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});