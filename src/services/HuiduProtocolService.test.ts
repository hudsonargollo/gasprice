import { HuiduProtocolService } from './HuiduProtocolService';
import { FuelPrices } from '../types';

// Mock logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('HuiduProtocolService', () => {
  let huiduService: HuiduProtocolService;
  let testPrices: FuelPrices;

  beforeEach(() => {
    huiduService = new HuiduProtocolService();
    testPrices = {
      regular: 3.45,
      premium: 3.75,
      diesel: 3.25
    };
  });

  describe('Frame Building', () => {
    it('should create a valid price update frame', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      
      expect(frame).toBeInstanceOf(Buffer);
      expect(frame.length).toBeGreaterThan(7); // Minimum frame size
      
      // Check frame structure
      expect(frame.readUInt8(0)).toBe(0x02); // STX
      expect(frame.readUInt8(1)).toBe(0x31); // Price update command
      expect(frame.readUInt8(frame.length - 1)).toBe(0x03); // ETX
    });

    it('should create a valid price update command object', () => {
      const command = huiduService.createPriceUpdateCommand(testPrices);
      
      expect(command.header).toBe(0x02);
      expect(command.command).toBe(0x31);
      expect(command.footer).toBe(0x03);
      expect(command.data).toBeInstanceOf(Buffer);
      expect(command.length).toBe(command.data.length);
      expect(command.checksum).toBeGreaterThan(0);
    });

    it('should include panel ID in the data payload when provided', () => {
      const panelId = 'panel-123';
      const command = huiduService.createPriceUpdateCommand(testPrices, panelId);
      
      const dataString = command.data.toString('utf8');
      const parsedData = JSON.parse(dataString);
      
      expect(parsedData.panelId).toBe(panelId);
      expect(parsedData.prices.regular).toBe('3.45');
      expect(parsedData.prices.premium).toBe('3.75');
      expect(parsedData.prices.diesel).toBe('3.25');
    });

    it('should use default panel ID when not provided', () => {
      const command = huiduService.createPriceUpdateCommand(testPrices);
      
      const dataString = command.data.toString('utf8');
      const parsedData = JSON.parse(dataString);
      
      expect(parsedData.panelId).toBe('default');
    });
  });

  describe('CRC16 Checksum', () => {
    it('should calculate consistent CRC16 checksums', () => {
      const testData = Buffer.from('Hello, World!', 'utf8');
      
      const checksum1 = huiduService['calculateCRC16'](testData);
      const checksum2 = huiduService['calculateCRC16'](testData);
      
      expect(checksum1).toBe(checksum2);
      expect(checksum1).toBeGreaterThan(0);
      expect(checksum1).toBeLessThanOrEqual(0xFFFF);
    });

    it('should produce different checksums for different data', () => {
      const data1 = Buffer.from('Test data 1', 'utf8');
      const data2 = Buffer.from('Test data 2', 'utf8');
      
      const checksum1 = huiduService['calculateCRC16'](data1);
      const checksum2 = huiduService['calculateCRC16'](data2);
      
      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle empty data', () => {
      const emptyData = Buffer.alloc(0);
      const checksum = huiduService['calculateCRC16'](emptyData);
      
      expect(checksum).toBe(0xFFFF); // Initial CRC value for empty data
    });
  });

  describe('Frame Validation', () => {
    it('should validate a correctly formed frame', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      const validation = huiduService.validateFrame(frame);
      
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject frames that are too short', () => {
      const shortFrame = Buffer.from([0x02, 0x31]);
      const validation = huiduService.validateFrame(shortFrame);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Frame too short');
    });

    it('should reject frames with invalid STX', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      frame.writeUInt8(0xFF, 0); // Corrupt STX
      
      const validation = huiduService.validateFrame(frame);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Invalid STX header');
    });

    it('should reject frames with invalid ETX', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      frame.writeUInt8(0xFF, frame.length - 1); // Corrupt ETX
      
      const validation = huiduService.validateFrame(frame);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Invalid ETX footer');
    });

    it('should reject frames with incorrect checksum', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      const checksumOffset = frame.length - 3; // 2 bytes before ETX
      frame.writeUInt16BE(0x0000, checksumOffset); // Corrupt checksum
      
      const validation = huiduService.validateFrame(frame);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Checksum mismatch');
    });

    it('should reject frames with incorrect length', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      frame.writeUInt16BE(999, 2); // Corrupt length field
      
      const validation = huiduService.validateFrame(frame);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Frame length mismatch');
    });
  });

  describe('Frame Parsing', () => {
    it('should parse a valid frame correctly', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      const parsed = huiduService.parseFrame(frame);
      
      expect(parsed).not.toBeNull();
      expect(parsed!.command).toBe(0x31);
      expect(parsed!.data).toBeInstanceOf(Buffer);
      
      // Verify the data can be parsed as JSON
      const dataString = parsed!.data.toString('utf8');
      const parsedData = JSON.parse(dataString);
      expect(parsedData.prices.regular).toBe('3.45');
    });

    it('should return null for invalid frames', () => {
      const invalidFrame = Buffer.from([0x02, 0x31, 0x00, 0x01, 0xFF, 0x00, 0x00, 0x03]);
      const parsed = huiduService.parseFrame(invalidFrame);
      
      expect(parsed).toBeNull();
    });
  });

  describe('Acknowledgment Frames', () => {
    it('should create a valid ACK frame', () => {
      const ackFrame = huiduService.createAckFrame();
      
      expect(ackFrame.readUInt8(0)).toBe(0x02); // STX
      expect(ackFrame.readUInt8(1)).toBe(0x06); // ACK command
      expect(ackFrame.readUInt8(ackFrame.length - 1)).toBe(0x03); // ETX
      
      const validation = huiduService.validateFrame(ackFrame);
      expect(validation.isValid).toBe(true);
    });

    it('should create a valid NAK frame', () => {
      const errorMessage = 'Invalid price data';
      const nakFrame = huiduService.createNakFrame(errorMessage);
      
      expect(nakFrame.readUInt8(0)).toBe(0x02); // STX
      expect(nakFrame.readUInt8(1)).toBe(0x15); // NAK command
      expect(nakFrame.readUInt8(nakFrame.length - 1)).toBe(0x03); // ETX
      
      const validation = huiduService.validateFrame(nakFrame);
      expect(validation.isValid).toBe(true);
    });

    it('should create NAK frame with default message when none provided', () => {
      const nakFrame = huiduService.createNakFrame();
      const parsed = huiduService.parseFrame(nakFrame);
      
      expect(parsed).not.toBeNull();
      expect(parsed!.data.toString('utf8')).toBe('NAK');
    });
  });

  describe('Frame Analysis', () => {
    it('should provide detailed frame information', () => {
      const frame = huiduService.createPriceUpdateFrame(testPrices);
      const info = huiduService.getFrameInfo(frame);
      
      expect(info.stx).toBe('0x02');
      expect(info.command).toBe('0x31');
      expect(info.etx).toBe('0x03');
      expect(info.length).toBeGreaterThan(0);
      expect(info.checksum).toMatch(/^0x[0-9a-f]{4}$/i);
      expect(info.isValid).toBe(true);
      expect(info.totalLength).toBe(frame.length);
    });

    it('should handle analysis of short frames', () => {
      const shortFrame = Buffer.from([0x02, 0x31]);
      const info = huiduService.getFrameInfo(shortFrame);
      
      expect(info.error).toBe('Frame too short for analysis');
    });
  });

  describe('Price Formatting', () => {
    it('should format prices to 2 decimal places', () => {
      const prices: FuelPrices = {
        regular: 3.4,
        premium: 3.789,
        diesel: 3
      };
      
      const command = huiduService.createPriceUpdateCommand(prices);
      const dataString = command.data.toString('utf8');
      const parsedData = JSON.parse(dataString);
      
      expect(parsedData.prices.regular).toBe('3.40');
      expect(parsedData.prices.premium).toBe('3.79');
      expect(parsedData.prices.diesel).toBe('3.00');
    });
  });

  describe('Round Trip Testing', () => {
    it('should maintain data integrity through frame creation and parsing', () => {
      const originalPrices = {
        regular: 4.56,
        premium: 4.89,
        diesel: 4.23
      };
      const panelId = 'test-panel-001';
      
      // Create frame
      const frame = huiduService.createPriceUpdateFrame(originalPrices, panelId);
      
      // Parse frame
      const parsed = huiduService.parseFrame(frame);
      expect(parsed).not.toBeNull();
      
      // Verify data integrity
      const dataString = parsed!.data.toString('utf8');
      const parsedData = JSON.parse(dataString);
      
      expect(parsedData.panelId).toBe(panelId);
      expect(parsedData.prices.regular).toBe('4.56');
      expect(parsedData.prices.premium).toBe('4.89');
      expect(parsedData.prices.diesel).toBe('4.23');
      expect(parsedData.timestamp).toBeDefined();
    });
  });
});