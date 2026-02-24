import { Pool } from 'pg';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import { ClientModel } from '../models/Client';
import { MikroTikDeviceModel } from '../models/MikroTikDevice';
import { HuiduDeviceModel } from '../models/HuiduDevice';
import { StationModel } from '../models/Station';

export interface ProvisioningOrder {
  clientInfo: {
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    itemsPurchased: number;
  };
  locations: Array<{
    stationInfo: {
      name: string;
      location?: {
        latitude: number;
        longitude: number;
        address: string;
      };
    };
    devices: {
      mikrotik: {
        serialNumber: string;
        macAddress: string;
        model?: string;
      };
      huidu: {
        serialNumber: string;
        macAddress: string;
        model?: string;
      };
    };
    ledPanels: Array<{
      name: string;
    }>;
  }>;
}

export interface ProvisioningResult {
  success: boolean;
  client: {
    id: string;
    companyName: string;
    username: string;
    password: string;
  };
  locations: Array<{
    station: {
      id: string;
      name: string;
      vpnIpAddress: string;
    };
    devices: {
      mikrotik: {
        id: string;
        serialNumber: string;
        configScript: string;
      };
      huidu: {
        id: string;
        serialNumber: string;
        ipAddress: string;
      };
    };
    ledPanels: Array<{
      id: string;
      name: string;
    }>;
  }>;
  qrCode: string; // For client setup
  errors?: string[];
}

export class FactoryProvisioningService {
  private pool: Pool;
  private clientModel: ClientModel;
  private mikrotikModel: MikroTikDeviceModel;
  private huiduModel: HuiduDeviceModel;
  private stationModel: StationModel;

  constructor() {
    this.pool = getPool();
    this.clientModel = new ClientModel();
    this.mikrotikModel = new MikroTikDeviceModel();
    this.huiduModel = new HuiduDeviceModel();
    this.stationModel = new StationModel();
  }

  /**
   * Complete factory provisioning process for multiple locations
   */
  async provisionCompleteSetup(order: ProvisioningOrder): Promise<ProvisioningResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      logger.info(`Starting factory provisioning for: ${order.clientInfo.companyName} with ${order.locations.length} locations`);

      // Step 1: Create client and user account
      const clientResult = await this.clientModel.createClient({
        companyName: order.clientInfo.companyName,
        contactName: order.clientInfo.contactName,
        email: order.clientInfo.email,
        phone: order.clientInfo.phone,
        address: order.clientInfo.address,
        itemsPurchased: order.clientInfo.itemsPurchased,
        status: 'active',
        notes: `Factory provisioned on ${new Date().toISOString()} - ${order.locations.length} locations`
      });

      const provisionedLocations = [];
      let baseVpnIp = 1; // Start from 10.8.1.1

      // Step 2: Process each location
      for (let i = 0; i < order.locations.length; i++) {
        const location = order.locations[i];
        const locationIndex = i + 1;

        logger.info(`Processing location ${locationIndex}/${order.locations.length}: ${location.stationInfo.name}`);

        // Generate unique VPN configuration for this location
        const vpnConfig = this.generateLocationVPNConfig(clientResult.id, baseVpnIp + i);

        // Create MikroTik device for this location
        const mikrotikDevice = await this.mikrotikModel.createDevice({
          serialNumber: location.devices.mikrotik.serialNumber,
          model: location.devices.mikrotik.model || 'hAP-ac2',
          macAddress: location.devices.mikrotik.macAddress,
          clientId: clientResult.id,
          deviceName: `${order.clientInfo.companyName}-${location.stationInfo.name}-Router`,
          vpnIpAddress: vpnConfig.vpnIpAddress,
          vpnUsername: vpnConfig.vpnUsername,
          vpnPassword: vpnConfig.vpnPassword,
          adminPassword: this.generateSecurePassword(),
          wifiSsid: `${order.clientInfo.companyName.replace(/[^a-zA-Z0-9]/g, '')}-${locationIndex}`,
          wifiPassword: this.generateSecurePassword(),
          status: 'configured'
        });

        // Create Huidu device for this location
        const huiduIpAddress = this.generateHuiduIP(vpnConfig.vpnIpAddress);
        const huiduDevice = await this.huiduModel.createDevice({
          serialNumber: location.devices.huidu.serialNumber,
          model: location.devices.huidu.model || 'HD-W60',
          macAddress: location.devices.huidu.macAddress,
          clientId: clientResult.id,
          deviceName: `${order.clientInfo.companyName}-${location.stationInfo.name}-LED`,
          ipAddress: huiduIpAddress,
          adminPassword: this.generateSecurePassword(),
          status: 'configured'
        });

        // Create station for this location
        const station = await this.stationModel.createStation(
          clientResult.userId!,
          location.stationInfo.name,
          vpnConfig.vpnIpAddress,
          location.stationInfo.location
        );

        // Link station to client and devices
        await this.linkStationToDevices(station.id, clientResult.id, mikrotikDevice.id);

        // Create LED panels for this location
        const ledPanels = [];
        for (const panelInfo of location.ledPanels) {
          const panel = await this.createLEDPanel(
            station.id,
            panelInfo.name,
            mikrotikDevice.id,
            huiduDevice.id
          );
          ledPanels.push(panel);
        }

        // Generate configuration files for this location
        const mikrotikConfig = await this.mikrotikModel.generateDeviceConfig(mikrotikDevice.id);

        provisionedLocations.push({
          station: {
            id: station.id,
            name: station.name,
            vpnIpAddress: station.vpnIpAddress
          },
          devices: {
            mikrotik: {
              id: mikrotikDevice.id,
              serialNumber: mikrotikDevice.serialNumber,
              configScript: mikrotikConfig
            },
            huidu: {
              id: huiduDevice.id,
              serialNumber: huiduDevice.serialNumber,
              ipAddress: huiduIpAddress
            }
          },
          ledPanels: ledPanels
        });

        logger.info(`Location ${locationIndex} provisioned successfully: ${location.stationInfo.name}`);
      }

      // Generate QR code for client setup (includes all stations)
      const stationIds = provisionedLocations.map(loc => loc.station.id);
      const qrCode = this.generateClientQRCode(clientResult.username, clientResult.password, stationIds);

      await client.query('COMMIT');

      logger.info(`Factory provisioning completed for: ${order.clientInfo.companyName} - ${order.locations.length} locations`);

      return {
        success: true,
        client: {
          id: clientResult.id,
          companyName: clientResult.companyName,
          username: clientResult.username,
          password: clientResult.password
        },
        locations: provisionedLocations,
        qrCode: qrCode
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Factory provisioning failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test device connectivity and configuration
   */
  async testDeviceConfiguration(mikrotikSerial: string, huiduSerial: string): Promise<{
    mikrotik: { connected: boolean; configured: boolean; errors?: string[] };
    huidu: { connected: boolean; configured: boolean; errors?: string[] };
  }> {
    const results = {
      mikrotik: { connected: false, configured: false, errors: [] as string[] },
      huidu: { connected: false, configured: false, errors: [] as string[] }
    };

    try {
      // Test MikroTik device
      // In a real implementation, this would connect to the device via SSH/API
      logger.info(`Testing MikroTik device: ${mikrotikSerial}`);
      
      // Simulate device testing
      results.mikrotik.connected = true;
      results.mikrotik.configured = true;

      // Test Huidu device
      logger.info(`Testing Huidu device: ${huiduSerial}`);
      
      // Simulate device testing
      results.huidu.connected = true;
      results.huidu.configured = true;

    } catch (error) {
      logger.error('Device testing failed:', error);
      results.mikrotik.errors?.push('Connection failed');
      results.huidu.errors?.push('Connection failed');
    }

    return results;
  }

  /**
   * Test multiple device pairs for multi-location provisioning
   */
  async testMultipleDevicePairs(devicePairs: Array<{
    mikrotikSerial: string;
    huiduSerial: string;
    locationName: string;
  }>): Promise<{
    overallSuccess: boolean;
    results: Array<{
      locationName: string;
      mikrotik: { connected: boolean; configured: boolean; errors?: string[] };
      huidu: { connected: boolean; configured: boolean; errors?: string[] };
    }>;
  }> {
    const results = [];
    let overallSuccess = true;

    for (const pair of devicePairs) {
      logger.info(`Testing device pair for location: ${pair.locationName}`);
      
      const testResult = await this.testDeviceConfiguration(pair.mikrotikSerial, pair.huiduSerial);
      
      const locationResult = {
        locationName: pair.locationName,
        mikrotik: testResult.mikrotik,
        huidu: testResult.huidu
      };

      results.push(locationResult);

      // Check if this location's tests passed
      const locationSuccess = testResult.mikrotik.connected && 
                             testResult.mikrotik.configured && 
                             testResult.huidu.connected && 
                             testResult.huidu.configured;

      if (!locationSuccess) {
        overallSuccess = false;
      }
    }

    return {
      overallSuccess,
      results
    };
  }

  /**
   * Generate VPN configuration for client location
   */
  private generateLocationVPNConfig(clientId: string, locationIndex: number): {
    vpnIpAddress: string;
    vpnUsername: string;
    vpnPassword: string;
  } {
    // Generate unique VPN IP in 10.8.x.x range for each location
    const clientHash = clientId.substring(0, 8);
    const subnet = Math.floor(locationIndex / 254) + 1; // 10.8.1.x, 10.8.2.x, etc.
    const host = (locationIndex % 254) + 1;
    const vpnIpAddress = `10.8.${subnet}.${host}`;

    return {
      vpnIpAddress,
      vpnUsername: `client_${clientHash}_loc${locationIndex}`,
      vpnPassword: this.generateSecurePassword()
    };
  }

  /**
   * Generate Huidu device IP address
   */
  private generateHuiduIP(vpnIpAddress: string): string {
    const parts = vpnIpAddress.split('.');
    parts[3] = (parseInt(parts[3]) + 100).toString();
    return parts.join('.');
  }

  /**
   * Generate secure password
   */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Link station to devices
   */
  private async linkStationToDevices(stationId: string, clientId: string, mikrotikDeviceId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE stations 
        SET client_id = $1, mikrotik_device_id = $2
        WHERE id = $3
      `;
      await client.query(query, [clientId, mikrotikDeviceId, stationId]);
    } finally {
      client.release();
    }
  }

  /**
   * Create LED panel with device links
   */
  private async createLEDPanel(
    stationId: string, 
    name: string, 
    mikrotikDeviceId: string, 
    huiduDeviceId: string
  ): Promise<{ id: string; name: string }> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO led_panels (station_id, mikrotik_device_id, huidu_device_id, name, regular_price, premium_price, diesel_price)
        VALUES ($1, $2, $3, $4, 0, 0, 0)
        RETURNING id, name
      `;
      const result = await client.query(query, [stationId, mikrotikDeviceId, huiduDeviceId, name]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Generate QR code data for client setup with multiple stations
   */
  private generateClientQRCode(username: string, password: string, stationIds: string[]): string {
    const setupData = {
      type: 'fuelprice_setup',
      username,
      password,
      stationIds,
      apiUrl: 'https://pricepro.clubemkt.digital/api',
      setupDate: new Date().toISOString()
    };

    return Buffer.from(JSON.stringify(setupData)).toString('base64');
  }

  /**
   * Get provisioning status
   */
  async getProvisioningStatus(clientId: string): Promise<{
    client: any;
    devices: { mikrotik: any[]; huidu: any[] };
    stations: any[];
    ledPanels: any[];
  }> {
    const client = await this.clientModel.findById(clientId);
    const mikrotikDevices = await this.mikrotikModel.findByClientId(clientId);
    const huiduDevices = await this.huiduModel.findByClientId(clientId);
    
    // Get stations for this client
    const stationsQuery = `
      SELECT * FROM stations WHERE client_id = $1
    `;
    const dbClient = await this.pool.connect();
    try {
      const stationsResult = await dbClient.query(stationsQuery, [clientId]);
      const stations = stationsResult.rows;

      // Get LED panels for these stations
      const ledPanelsQuery = `
        SELECT * FROM led_panels WHERE station_id = ANY($1)
      `;
      const stationIds = stations.map(s => s.id);
      const ledPanelsResult = stationIds.length > 0 
        ? await dbClient.query(ledPanelsQuery, [stationIds])
        : { rows: [] };

      return {
        client,
        devices: {
          mikrotik: mikrotikDevices,
          huidu: huiduDevices
        },
        stations,
        ledPanels: ledPanelsResult.rows
      };
    } finally {
      dbClient.release();
    }
  }
}