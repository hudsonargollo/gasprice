import { createServer, Server, Socket } from 'net';
import { logger } from '../utils/logger';

/**
 * Mock LED Panel TCP Server for testing Huidu protocol communication
 * Simulates a Huidu HD-W60 controller for development and testing
 */
export class MockLEDPanel {
  private server: Server;
  private port: number;
  private isRunning: boolean = false;
  private connections: Set<Socket> = new Set();
  private currentPrices: { regular: number; premium: number; diesel: number } = {
    regular: 3.45,
    premium: 3.65,
    diesel: 3.25,
  };

  constructor(port: number = 5005) {
    this.port = port;
    this.server = createServer();
    this.setupServer();
  }

  private setupServer(): void {
    this.server.on('connection', (socket: Socket) => {
      const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.info(`Mock LED Panel: Client connected from ${clientAddress}`);
      
      this.connections.add(socket);

      socket.on('data', (data: Buffer) => {
        this.handleIncomingData(socket, data, clientAddress);
      });

      socket.on('close', () => {
        logger.info(`Mock LED Panel: Client disconnected from ${clientAddress}`);
        this.connections.delete(socket);
      });

      socket.on('error', (error) => {
        logger.error(`Mock LED Panel: Socket error from ${clientAddress}:`, error);
        this.connections.delete(socket);
      });
    });

    this.server.on('error', (error) => {
      logger.error('Mock LED Panel: Server error:', error);
    });

    this.server.on('listening', () => {
      logger.info(`Mock LED Panel: Server listening on port ${this.port}`);
    });
  }

  private handleIncomingData(socket: Socket, data: Buffer, clientAddress: string): void {
    logger.debug(`Mock LED Panel: Received data from ${clientAddress}: ${data.toString('hex')}`);

    try {
      // Parse Huidu protocol frame
      const frame = this.parseHuiduFrame(data);
      
      if (frame) {
        logger.info(`Mock LED Panel: Parsed frame - Command: 0x${frame.command.toString(16)}, Data length: ${frame.dataLength}`);
        
        // Process the command
        const response = this.processCommand(frame);
        
        if (response) {
          socket.write(response);
          logger.debug(`Mock LED Panel: Sent response to ${clientAddress}: ${response.toString('hex')}`);
        }
      } else {
        logger.warn(`Mock LED Panel: Invalid frame received from ${clientAddress}`);
        // Send error response
        const errorResponse = this.createErrorResponse();
        socket.write(errorResponse);
      }
    } catch (error) {
      logger.error(`Mock LED Panel: Error processing data from ${clientAddress}:`, error);
      const errorResponse = this.createErrorResponse();
      socket.write(errorResponse);
    }
  }

  private parseHuiduFrame(data: Buffer): {
    header: number;
    command: number;
    dataLength: number;
    data: Buffer;
    checksum: number;
    footer: number;
  } | null {
    if (data.length < 7) {
      return null; // Minimum frame size
    }

    const header = data.readUInt8(0);
    if (header !== 0x02) {
      return null; // Invalid header
    }

    const command = data.readUInt8(1);
    const dataLength = data.readUInt16BE(2);
    
    if (data.length < 4 + dataLength + 2 + 1) {
      return null; // Incomplete frame
    }

    const frameData = data.subarray(4, 4 + dataLength);
    const checksum = data.readUInt16BE(4 + dataLength);
    const footer = data.readUInt8(4 + dataLength + 2);

    if (footer !== 0x03) {
      return null; // Invalid footer
    }

    return {
      header,
      command,
      dataLength,
      data: frameData,
      checksum,
      footer,
    };
  }

  private processCommand(frame: {
    header: number;
    command: number;
    dataLength: number;
    data: Buffer;
    checksum: number;
    footer: number;
  }): Buffer | null {
    switch (frame.command) {
      case 0x31: // Price update command
        return this.handlePriceUpdate(frame.data);
      
      case 0x32: // Status query command
        return this.handleStatusQuery();
      
      case 0x33: // Ping/ACK command
        return this.handlePing();
      
      default:
        logger.warn(`Mock LED Panel: Unknown command: 0x${frame.command.toString(16)}`);
        return this.createErrorResponse();
    }
  }

  private handlePriceUpdate(data: Buffer): Buffer {
    try {
      // Parse price data (simplified - assumes UTF-8 encoded JSON)
      const priceDataStr = data.toString('utf-8');
      logger.info(`Mock LED Panel: Price update data: ${priceDataStr}`);
      
      // Try to parse as JSON
      let prices;
      try {
        prices = JSON.parse(priceDataStr);
      } catch {
        // If not JSON, try to parse as simple format
        // For testing, we'll just update with some default values
        prices = {
          regular: 3.50,
          premium: 3.70,
          diesel: 3.30,
        };
      }

      // Update current prices
      if (prices.regular !== undefined) this.currentPrices.regular = prices.regular;
      if (prices.premium !== undefined) this.currentPrices.premium = prices.premium;
      if (prices.diesel !== undefined) this.currentPrices.diesel = prices.diesel;

      logger.info(`Mock LED Panel: Prices updated:`, this.currentPrices);

      // Create success response
      return this.createSuccessResponse();
    } catch (error) {
      logger.error('Mock LED Panel: Error processing price update:', error);
      return this.createErrorResponse();
    }
  }

  private handleStatusQuery(): Buffer {
    // Return current status and prices
    const statusData = {
      online: true,
      prices: this.currentPrices,
      timestamp: new Date().toISOString(),
    };

    const statusJson = JSON.stringify(statusData);
    const statusBuffer = Buffer.from(statusJson, 'utf-8');

    return this.createResponse(0x32, statusBuffer);
  }

  private handlePing(): Buffer {
    // Simple ACK response
    return this.createResponse(0x33, Buffer.from('PONG', 'utf-8'));
  }

  private createSuccessResponse(): Buffer {
    const responseData = Buffer.from('OK', 'utf-8');
    return this.createResponse(0x31, responseData);
  }

  private createErrorResponse(): Buffer {
    const responseData = Buffer.from('ERROR', 'utf-8');
    return this.createResponse(0xFF, responseData);
  }

  private createResponse(command: number, data: Buffer): Buffer {
    const header = 0x02;
    const footer = 0x03;
    const dataLength = data.length;
    
    // Calculate CRC16-CCITT checksum (simplified for testing)
    const checksum = this.calculateCRC16(data);
    
    const frame = Buffer.alloc(1 + 1 + 2 + dataLength + 2 + 1);
    let offset = 0;
    
    frame.writeUInt8(header, offset++);
    frame.writeUInt8(command, offset++);
    frame.writeUInt16BE(dataLength, offset);
    offset += 2;
    
    data.copy(frame, offset);
    offset += dataLength;
    
    frame.writeUInt16BE(checksum, offset);
    offset += 2;
    
    frame.writeUInt8(footer, offset);
    
    return frame;
  }

  private calculateCRC16(data: Buffer): number {
    // Simplified CRC16-CCITT calculation for testing
    // In a real implementation, this would be the proper CRC16-CCITT algorithm
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i] << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return crc;
  }

  /**
   * Start the mock LED panel server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }

      this.server.listen(this.port, () => {
        this.isRunning = true;
        logger.info(`Mock LED Panel: Started on port ${this.port}`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.warn(`Mock LED Panel: Port ${this.port} is already in use`);
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Stop the mock LED panel server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve();
        return;
      }

      // Close all connections
      this.connections.forEach((socket) => {
        socket.destroy();
      });
      this.connections.clear();

      this.server.close(() => {
        this.isRunning = false;
        logger.info('Mock LED Panel: Server stopped');
        resolve();
      });
    });
  }

  /**
   * Get current prices
   */
  public getCurrentPrices(): { regular: number; premium: number; diesel: number } {
    return { ...this.currentPrices };
  }

  /**
   * Set prices manually (for testing)
   */
  public setPrices(prices: { regular?: number; premium?: number; diesel?: number }): void {
    if (prices.regular !== undefined) this.currentPrices.regular = prices.regular;
    if (prices.premium !== undefined) this.currentPrices.premium = prices.premium;
    if (prices.diesel !== undefined) this.currentPrices.diesel = prices.diesel;
    
    logger.info('Mock LED Panel: Prices set manually:', this.currentPrices);
  }

  /**
   * Get server status
   */
  public getStatus(): {
    isRunning: boolean;
    port: number;
    connections: number;
    currentPrices: { regular: number; premium: number; diesel: number };
  } {
    return {
      isRunning: this.isRunning,
      port: this.port,
      connections: this.connections.size,
      currentPrices: { ...this.currentPrices },
    };
  }

  /**
   * Simulate connection issues (for testing error handling)
   */
  public simulateConnectionIssue(duration: number = 5000): void {
    logger.info(`Mock LED Panel: Simulating connection issues for ${duration}ms`);
    
    // Close all current connections
    this.connections.forEach((socket) => {
      socket.destroy();
    });
    this.connections.clear();

    // Temporarily stop accepting new connections
    this.server.close();
    
    setTimeout(() => {
      this.server.listen(this.port, () => {
        logger.info('Mock LED Panel: Connection issues simulation ended');
      });
    }, duration);
  }
}