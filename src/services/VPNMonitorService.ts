import { exec } from 'child_process';
import { promisify } from 'util';
import { StationModel } from '../models/Station';
import { ConnectionStatus, Station } from '../types';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class VPNMonitorService {
  private stationModel: StationModel;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private connectionStatuses: Map<string, ConnectionStatus> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly PING_TIMEOUT = 5000; // 5 seconds

  constructor() {
    this.stationModel = new StationModel();
  }

  /**
   * Start monitoring all stations
   */
  async startMonitoring(): Promise<void> {
    try {
      logger.info('Starting VPN monitoring service...');
      
      // Get all stations from database
      const stations = await this.stationModel.getAllStations();
      
      // Start monitoring each station
      for (const station of stations) {
        await this.startStationMonitoring(station.id, station.vpnIpAddress);
      }
      
      logger.info(`VPN monitoring started for ${stations.length} stations`);
    } catch (error) {
      logger.error('Error starting VPN monitoring:', error);
      throw error;
    }
  }

  /**
   * Start monitoring a specific station
   */
  async startStationMonitoring(stationId: string, vpnIpAddress: string): Promise<void> {
    try {
      // Stop existing monitoring if any
      this.stopStationMonitoring(stationId);

      // Initialize connection status
      this.connectionStatuses.set(stationId, {
        isOnline: false,
        lastSeen: null,
        consecutiveFailures: 0
      });

      // Perform initial ping
      await this.performHeartbeat(stationId, vpnIpAddress);

      // Set up recurring heartbeat
      const interval = setInterval(async () => {
        await this.performHeartbeat(stationId, vpnIpAddress);
      }, this.HEARTBEAT_INTERVAL);

      this.monitoringIntervals.set(stationId, interval);
      
      logger.info(`Started monitoring station ${stationId} at ${vpnIpAddress}`);
    } catch (error) {
      logger.error(`Error starting monitoring for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Stop monitoring a specific station
   */
  stopStationMonitoring(stationId: string): void {
    const interval = this.monitoringIntervals.get(stationId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(stationId);
      logger.info(`Stopped monitoring station ${stationId}`);
    }
  }

  /**
   * Stop monitoring all stations
   */
  stopAllMonitoring(): void {
    logger.info('Stopping all VPN monitoring...');
    
    for (const [stationId, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      logger.debug(`Stopped monitoring station ${stationId}`);
    }
    
    this.monitoringIntervals.clear();
    this.connectionStatuses.clear();
    
    logger.info('All VPN monitoring stopped');
  }

  /**
   * Get current connection status for a station
   */
  getConnectionStatus(stationId: string): ConnectionStatus | null {
    return this.connectionStatuses.get(stationId) || null;
  }

  /**
   * Get connection status for all monitored stations
   */
  getAllConnectionStatuses(): Map<string, ConnectionStatus> {
    return new Map(this.connectionStatuses);
  }

  /**
   * Perform heartbeat ping to a station
   */
  private async performHeartbeat(stationId: string, vpnIpAddress: string): Promise<void> {
    try {
      const currentStatus = this.connectionStatuses.get(stationId) || {
        isOnline: false,
        lastSeen: null,
        consecutiveFailures: 0
      };

      logger.debug(`Performing heartbeat for station ${stationId} at ${vpnIpAddress}`);

      const isReachable = await this.pingHost(vpnIpAddress);
      const now = new Date();

      if (isReachable) {
        // Successful ping
        const newStatus: ConnectionStatus = {
          isOnline: true,
          lastSeen: now,
          consecutiveFailures: 0
        };

        // Update status if it changed from offline to online
        if (!currentStatus.isOnline) {
          logger.info(`Station ${stationId} came online`);
          await this.stationModel.updateStationStatus(stationId, true, now);
        } else {
          // Just update the last sync time
          await this.stationModel.updateStationStatus(stationId, true, now);
        }

        this.connectionStatuses.set(stationId, newStatus);
        logger.debug(`Heartbeat successful for station ${stationId}`);
      } else {
        // Failed ping
        const consecutiveFailures = currentStatus.consecutiveFailures + 1;
        const shouldMarkOffline = consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES;

        const newStatus: ConnectionStatus = {
          isOnline: shouldMarkOffline ? false : currentStatus.isOnline,
          lastSeen: currentStatus.lastSeen,
          consecutiveFailures
        };

        // Update status if we should mark it offline
        if (shouldMarkOffline && currentStatus.isOnline) {
          logger.warn(`Station ${stationId} marked offline after ${consecutiveFailures} consecutive failures`);
          await this.stationModel.updateStationStatus(stationId, false);
        }

        this.connectionStatuses.set(stationId, newStatus);
        logger.debug(`Heartbeat failed for station ${stationId} (${consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES})`);
      }
    } catch (error) {
      logger.error(`Error performing heartbeat for station ${stationId}:`, error);
      
      // Treat errors as failed pings
      const currentStatus = this.connectionStatuses.get(stationId) || {
        isOnline: false,
        lastSeen: null,
        consecutiveFailures: 0
      };

      const consecutiveFailures = currentStatus.consecutiveFailures + 1;
      const shouldMarkOffline = consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES;

      const newStatus: ConnectionStatus = {
        isOnline: shouldMarkOffline ? false : currentStatus.isOnline,
        lastSeen: currentStatus.lastSeen,
        consecutiveFailures
      };

      if (shouldMarkOffline && currentStatus.isOnline) {
        logger.warn(`Station ${stationId} marked offline due to heartbeat error after ${consecutiveFailures} failures`);
        await this.stationModel.updateStationStatus(stationId, false);
      }

      this.connectionStatuses.set(stationId, newStatus);
    }
  }

  /**
   * Ping a host using ICMP
   */
  private async pingHost(ipAddress: string): Promise<boolean> {
    try {
      // Use platform-appropriate ping command
      const isWindows = process.platform === 'win32';
      const pingCommand = isWindows 
        ? `ping -n 1 -w ${this.PING_TIMEOUT} ${ipAddress}`
        : `ping -c 1 -W ${Math.ceil(this.PING_TIMEOUT / 1000)} ${ipAddress}`;

      logger.debug(`Executing ping command: ${pingCommand}`);

      const { stdout, stderr } = await execAsync(pingCommand);
      
      // Check if ping was successful based on platform
      if (isWindows) {
        // Windows ping success indicators
        return stdout.includes('TTL=') || stdout.includes('time<') || stdout.includes('time=');
      } else {
        // Unix/Linux ping success indicators
        return stdout.includes('1 received') || stdout.includes('1 packets received');
      }
    } catch (error) {
      // Ping command failed (host unreachable, timeout, etc.)
      logger.debug(`Ping failed for ${ipAddress}:`, error);
      return false;
    }
  }

  /**
   * Add a new station to monitoring
   */
  async addStationToMonitoring(station: Station): Promise<void> {
    try {
      await this.startStationMonitoring(station.id, station.vpnIpAddress);
      logger.info(`Added station ${station.id} (${station.name}) to VPN monitoring`);
    } catch (error) {
      logger.error(`Error adding station ${station.id} to monitoring:`, error);
      throw error;
    }
  }

  /**
   * Remove a station from monitoring
   */
  removeStationFromMonitoring(stationId: string): void {
    this.stopStationMonitoring(stationId);
    this.connectionStatuses.delete(stationId);
    logger.info(`Removed station ${stationId} from VPN monitoring`);
  }

  /**
   * Update monitoring for a station (e.g., when IP address changes)
   */
  async updateStationMonitoring(stationId: string, newVpnIpAddress: string): Promise<void> {
    try {
      this.stopStationMonitoring(stationId);
      await this.startStationMonitoring(stationId, newVpnIpAddress);
      logger.info(`Updated monitoring for station ${stationId} with new IP: ${newVpnIpAddress}`);
    } catch (error) {
      logger.error(`Error updating monitoring for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    totalStations: number;
    onlineStations: number;
    offlineStations: number;
    monitoringIntervals: number;
  } {
    const totalStations = this.connectionStatuses.size;
    let onlineStations = 0;
    let offlineStations = 0;

    for (const status of this.connectionStatuses.values()) {
      if (status.isOnline) {
        onlineStations++;
      } else {
        offlineStations++;
      }
    }

    return {
      totalStations,
      onlineStations,
      offlineStations,
      monitoringIntervals: this.monitoringIntervals.size
    };
  }
}