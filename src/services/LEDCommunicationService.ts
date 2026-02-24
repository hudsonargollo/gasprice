import { Socket } from 'net';
import { HuiduProtocolService } from './HuiduProtocolService';
import { VPNMonitorService } from './VPNMonitorService';
import { FuelPrices, UpdateResult } from '../types';
import { logger } from '../utils/logger';

export class LEDCommunicationService {
  private huiduProtocol: HuiduProtocolService;
  private vpnMonitor: VPNMonitorService | undefined;
  private readonly TCP_PORT = 5005;
  private readonly CONNECTION_TIMEOUT = 5000;
  private readonly RESPONSE_TIMEOUT = 3000;

  constructor(vpnMonitor?: VPNMonitorService) {
    this.huiduProtocol = new HuiduProtocolService();
    this.vpnMonitor = vpnMonitor;
  }

  async sendPriceUpdate(
    ipAddress: string,
    prices: FuelPrices,
    panelId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Sending price update to ${ipAddress}:${this.TCP_PORT}`);

      if (this.vpnMonitor) {
        const isConnected = await this.verifyVPNConnectivity(ipAddress);
        if (!isConnected) {
          const error = `VPN connectivity check failed for ${ipAddress}`;
          logger.warn(error);
          return { success: false, error };
        }
      }

      const frame = this.huiduProtocol.createPriceUpdateFrame(prices, panelId);
      const result = await this.sendTCPFrame(ipAddress, frame);
      
      if (result.success) {
        logger.info(`Price update sent successfully to ${ipAddress}`);
      } else {
        logger.error(`Failed to send price update to ${ipAddress}: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = `Error sending price update to ${ipAddress}: ${error}`;
      logger.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async sendTCPFramePublic(
    ipAddress: string,
    port: number,
    frame: Buffer
  ): Promise<{ success: boolean; error?: string; response?: Buffer }> {
    return new Promise((resolve) => {
      const socket = new Socket();
      let responseReceived = false;
      let responseBuffer = Buffer.alloc(0);

      const connectionTimer = setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
          resolve({ success: false, error: 'Connection timeout' });
        }
      }, this.CONNECTION_TIMEOUT);

      let responseTimer: NodeJS.Timeout;

      socket.on('connect', () => {
        logger.debug(`TCP connection established to ${ipAddress}:${port}`);
        clearTimeout(connectionTimer);

        socket.write(frame, (error) => {
          if (error) {
            socket.destroy();
            resolve({ success: false, error: `Write error: ${error.message}` });
            return;
          }

          responseTimer = setTimeout(() => {
            if (!responseReceived && !socket.destroyed) {
              socket.destroy();
              resolve({ success: false, error: 'Response timeout' });
            }
          }, this.RESPONSE_TIMEOUT);
        });
      });

      socket.on('data', (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);
        
        if (this.isCompleteFrame(responseBuffer)) {
          responseReceived = true;
          clearTimeout(responseTimer);
          
          const validation = this.huiduProtocol.validateFrame(responseBuffer);
          socket.destroy();
          
          if (validation.isValid) {
            resolve({ success: true, response: responseBuffer });
          } else {
            resolve({ 
              success: false, 
              error: `Invalid response frame: ${validation.error}`,
              response: responseBuffer 
            });
          }
        }
      });

      socket.on('error', (error) => {
        clearTimeout(connectionTimer);
        if (responseTimer) clearTimeout(responseTimer);
        resolve({ success: false, error: `TCP error: ${error.message}` });
      });

      socket.on('close', () => {
        clearTimeout(connectionTimer);
        if (responseTimer) clearTimeout(responseTimer);
        
        if (!responseReceived) {
          resolve({ success: false, error: 'Connection closed without response' });
        }
      });

      socket.connect(port, ipAddress);
    });
  }

  private async sendTCPFrame(
    ipAddress: string,
    frame: Buffer
  ): Promise<{ success: boolean; error?: string; response?: Buffer }> {
    return this.sendTCPFramePublic(ipAddress, this.TCP_PORT, frame);
  }

  private isCompleteFrame(buffer: Buffer): boolean {
    if (buffer.length < 7) return false;
    if (buffer.readUInt8(0) !== 0x02) return false;

    try {
      const dataLength = buffer.readUInt16BE(2);
      const expectedFrameLength = 1 + 1 + 2 + dataLength + 2 + 1;
      
      if (buffer.length >= expectedFrameLength) {
        const etxPosition = expectedFrameLength - 1;
        return buffer.readUInt8(etxPosition) === 0x03;
      }
    } catch (error) {
      logger.debug('Error checking frame completeness:', error);
    }

    return false;
  }

  private async verifyVPNConnectivity(ipAddress: string): Promise<boolean> {
    if (!this.vpnMonitor) {
      return true;
    }

    const allStatuses = this.vpnMonitor.getAllConnectionStatuses();
    
    for (const [stationId, status] of allStatuses) {
      if (status.isOnline) {
        return true;
      }
    }

    return false;
  }
}
