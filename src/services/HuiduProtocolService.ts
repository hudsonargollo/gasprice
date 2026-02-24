import { HuiduCommand, FuelPrices } from '../types';
import { logger } from '../utils/logger';

export class HuiduProtocolService {
  // Protocol constants
  private readonly STX = 0x02; // Start of text
  private readonly ETX = 0x03; // End of text
  private readonly CMD_PRICE_UPDATE = 0x31; // Command for price update
  
  // CRC16-CCITT polynomial
  private readonly CRC16_POLY = 0x1021;

  /**
   * Create a Huidu protocol frame for price updates
   */
  createPriceUpdateFrame(prices: FuelPrices, panelId?: string): Buffer {
    try {
      // Create the data payload
      const dataPayload = this.createPriceDataPayload(prices, panelId);
      
      // Build the complete frame
      const frame = this.buildFrame(this.CMD_PRICE_UPDATE, dataPayload);
      
      logger.debug(`Created Huidu frame: ${frame.toString('hex')}`);
      return frame;
    } catch (error) {
      logger.error('Error creating Huidu price update frame:', error);
      throw error;
    }
  }

  /**
   * Create a Huidu command object for price updates
   */
  createPriceUpdateCommand(prices: FuelPrices, panelId?: string): HuiduCommand {
    try {
      const dataPayload = this.createPriceDataPayload(prices, panelId);
      const checksum = this.calculateCRC16(dataPayload);

      const command: HuiduCommand = {
        header: this.STX,
        command: this.CMD_PRICE_UPDATE,
        length: dataPayload.length,
        data: dataPayload,
        checksum,
        footer: this.ETX
      };

      logger.debug(`Created Huidu command:`, {
        header: `0x${command.header.toString(16).padStart(2, '0')}`,
        command: `0x${command.command.toString(16).padStart(2, '0')}`,
        length: command.length,
        data: command.data.toString('hex'),
        checksum: `0x${command.checksum.toString(16).padStart(4, '0')}`,
        footer: `0x${command.footer.toString(16).padStart(2, '0')}`
      });

      return command;
    } catch (error) {
      logger.error('Error creating Huidu command:', error);
      throw error;
    }
  }

  /**
   * Build a complete protocol frame
   */
  private buildFrame(command: number, data: Buffer): Buffer {
    const length = data.length;
    const checksum = this.calculateCRC16(data);

    // Frame structure: [STX][CMD][LEN][DATA][CRC16][ETX]
    const frameSize = 1 + 1 + 2 + length + 2 + 1; // STX + CMD + LEN(2 bytes) + DATA + CRC16(2 bytes) + ETX
    const frame = Buffer.alloc(frameSize);

    let offset = 0;

    // STX (1 byte)
    frame.writeUInt8(this.STX, offset);
    offset += 1;

    // Command (1 byte)
    frame.writeUInt8(command, offset);
    offset += 1;

    // Length (2 bytes, big-endian)
    frame.writeUInt16BE(length, offset);
    offset += 2;

    // Data payload
    data.copy(frame, offset);
    offset += length;

    // CRC16 checksum (2 bytes, big-endian)
    frame.writeUInt16BE(checksum, offset);
    offset += 2;

    // ETX (1 byte)
    frame.writeUInt8(this.ETX, offset);

    return frame;
  }

  /**
   * Create data payload for price updates
   */
  private createPriceDataPayload(prices: FuelPrices, panelId?: string): Buffer {
    // Create JSON payload with price data
    const priceData = {
      panelId: panelId || 'default',
      timestamp: new Date().toISOString(),
      prices: {
        regular: this.formatPrice(prices.regular),
        premium: this.formatPrice(prices.premium),
        diesel: this.formatPrice(prices.diesel)
      }
    };

    // Convert to UTF-8 encoded buffer
    const jsonString = JSON.stringify(priceData);
    return Buffer.from(jsonString, 'utf8');
  }

  /**
   * Format price to 2 decimal places
   */
  private formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Calculate CRC16-CCITT checksum
   * Polynomial: 0x1021 (x^16 + x^12 + x^5 + 1)
   * Initial value: 0xFFFF
   */
  private calculateCRC16(data: Buffer): number {
    let crc = 0xFFFF;

    for (let i = 0; i < data.length; i++) {
      crc ^= (data[i] << 8);

      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ this.CRC16_POLY;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF; // Keep it 16-bit
      }
    }

    return crc;
  }

  /**
   * Validate a received frame
   */
  validateFrame(frame: Buffer): { isValid: boolean; error?: string } {
    try {
      if (frame.length < 7) { // Minimum frame size: STX + CMD + LEN(2) + CRC(2) + ETX
        return { isValid: false, error: 'Frame too short' };
      }

      // Check STX
      if (frame.readUInt8(0) !== this.STX) {
        return { isValid: false, error: 'Invalid STX header' };
      }

      // Check ETX
      if (frame.readUInt8(frame.length - 1) !== this.ETX) {
        return { isValid: false, error: 'Invalid ETX footer' };
      }

      // Extract length
      const dataLength = frame.readUInt16BE(2);
      const expectedFrameLength = 1 + 1 + 2 + dataLength + 2 + 1;

      if (frame.length !== expectedFrameLength) {
        return { isValid: false, error: 'Frame length mismatch' };
      }

      // Extract and validate checksum
      const dataStart = 4;
      const dataEnd = dataStart + dataLength;
      const data = frame.subarray(dataStart, dataEnd);
      const receivedChecksum = frame.readUInt16BE(dataEnd);
      const calculatedChecksum = this.calculateCRC16(data);

      if (receivedChecksum !== calculatedChecksum) {
        return { 
          isValid: false, 
          error: `Checksum mismatch: received 0x${receivedChecksum.toString(16)}, calculated 0x${calculatedChecksum.toString(16)}` 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Validation error: ${error}` };
    }
  }

  /**
   * Parse a received frame and extract data
   */
  parseFrame(frame: Buffer): { command: number; data: Buffer } | null {
    const validation = this.validateFrame(frame);
    if (!validation.isValid) {
      logger.error('Frame validation failed:', validation.error);
      return null;
    }

    try {
      const command = frame.readUInt8(1);
      const dataLength = frame.readUInt16BE(2);
      const dataStart = 4;
      const data = frame.subarray(dataStart, dataStart + dataLength);

      return { command, data };
    } catch (error) {
      logger.error('Error parsing frame:', error);
      return null;
    }
  }

  /**
   * Create a simple acknowledgment frame
   */
  createAckFrame(): Buffer {
    const ackData = Buffer.from('ACK', 'utf8');
    return this.buildFrame(0x06, ackData); // 0x06 is ACK command
  }

  /**
   * Create a negative acknowledgment frame
   */
  createNakFrame(errorMessage?: string): Buffer {
    const nakData = Buffer.from(errorMessage || 'NAK', 'utf8');
    return this.buildFrame(0x15, nakData); // 0x15 is NAK command
  }

  /**
   * Create a custom frame with specified command and data
   */
  createCustomFrame(command: number, data: Buffer): Buffer {
    return this.buildFrame(command, data);
  }

  /**
   * Get frame information for debugging
   */
  getFrameInfo(frame: Buffer): any {
    if (frame.length < 7) {
      return { error: 'Frame too short for analysis' };
    }

    try {
      const stx = frame.readUInt8(0);
      const command = frame.readUInt8(1);
      const length = frame.readUInt16BE(2);
      const dataStart = 4;
      const dataEnd = dataStart + length;
      const data = frame.subarray(dataStart, dataEnd);
      const checksum = frame.readUInt16BE(dataEnd);
      const etx = frame.readUInt8(frame.length - 1);

      return {
        stx: `0x${stx.toString(16).padStart(2, '0')}`,
        command: `0x${command.toString(16).padStart(2, '0')}`,
        length,
        data: data.toString('hex'),
        dataUtf8: data.toString('utf8'),
        checksum: `0x${checksum.toString(16).padStart(4, '0')}`,
        etx: `0x${etx.toString(16).padStart(2, '0')}`,
        totalLength: frame.length,
        isValid: this.validateFrame(frame).isValid
      };
    } catch (error) {
      return { error: `Analysis error: ${error}` };
    }
  }
}