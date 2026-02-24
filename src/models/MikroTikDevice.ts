import { Pool } from 'pg';
import { MikroTikDevice } from '../types';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export class MikroTikDeviceModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createDevice(deviceData: Omit<MikroTikDevice, 'id' | 'createdAt' | 'updatedAt'>): Promise<MikroTikDevice> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO mikrotik_devices (
          serial_number, model, mac_address, client_id, device_name, 
          vpn_ip_address, vpn_username, vpn_password, admin_password, 
          wifi_ssid, wifi_password, status, deployment_date, last_seen, 
          location_address, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        deviceData.serialNumber,
        deviceData.model,
        deviceData.macAddress,
        deviceData.clientId || null,
        deviceData.deviceName || null,
        deviceData.vpnIpAddress || null,
        deviceData.vpnUsername || null,
        deviceData.vpnPassword || null,
        deviceData.adminPassword || null,
        deviceData.wifiSsid || null,
        deviceData.wifiPassword || null,
        deviceData.status,
        deviceData.deploymentDate || null,
        deviceData.lastSeen || null,
        deviceData.locationAddress || null,
        deviceData.notes || null
      ]);
      
      const row = result.rows[0];
      logger.info(`MikroTik device created: ${deviceData.serialNumber}`);
      
      return this.mapRowToDevice(row);
    } catch (error) {
      logger.error('Error creating MikroTik device:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(deviceId: string): Promise<MikroTikDevice | null> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM mikrotik_devices WHERE id = $1`;
      const result = await client.query(query, [deviceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDevice(result.rows[0]);
    } catch (error) {
      logger.error('Error finding MikroTik device by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findBySerialNumber(serialNumber: string): Promise<MikroTikDevice | null> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM mikrotik_devices WHERE serial_number = $1`;
      const result = await client.query(query, [serialNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDevice(result.rows[0]);
    } catch (error) {
      logger.error('Error finding MikroTik device by serial number:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByClientId(clientId: string): Promise<MikroTikDevice[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM mikrotik_devices 
        WHERE client_id = $1 
        ORDER BY device_name ASC, serial_number ASC
      `;
      const result = await client.query(query, [clientId]);
      
      return result.rows.map(row => this.mapRowToDevice(row));
    } catch (error) {
      logger.error('Error finding MikroTik devices by client ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllDevices(): Promise<MikroTikDevice[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM mikrotik_devices 
        ORDER BY device_name ASC, serial_number ASC
      `;
      const result = await client.query(query);
      
      return result.rows.map(row => this.mapRowToDevice(row));
    } catch (error) {
      logger.error('Error getting all MikroTik devices:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDevice(deviceId: string, updates: Partial<Omit<MikroTikDevice, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MikroTikDevice | null> {
    const client = await this.pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMappings = {
        serialNumber: 'serial_number',
        model: 'model',
        macAddress: 'mac_address',
        clientId: 'client_id',
        deviceName: 'device_name',
        vpnIpAddress: 'vpn_ip_address',
        vpnUsername: 'vpn_username',
        vpnPassword: 'vpn_password',
        adminPassword: 'admin_password',
        wifiSsid: 'wifi_ssid',
        wifiPassword: 'wifi_password',
        status: 'status',
        deploymentDate: 'deployment_date',
        lastSeen: 'last_seen',
        locationAddress: 'location_address',
        notes: 'notes'
      };

      for (const [key, dbField] of Object.entries(fieldMappings)) {
        if (updates[key as keyof typeof updates] !== undefined) {
          setParts.push(`${dbField} = $${paramIndex++}`);
          values.push(updates[key as keyof typeof updates]);
        }
      }

      if (setParts.length === 0) {
        return await this.findById(deviceId);
      }

      values.push(deviceId);
      
      const query = `
        UPDATE mikrotik_devices 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`MikroTik device updated: ${deviceId}`);
      return this.mapRowToDevice(result.rows[0]);
    } catch (error) {
      logger.error('Error updating MikroTik device:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM mikrotik_devices WHERE id = $1`;
      const result = await client.query(query, [deviceId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`MikroTik device deleted: ${deviceId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting MikroTik device:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async generateDeviceConfig(deviceId: string): Promise<string> {
    const device = await this.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Generate MikroTik configuration script
    const config = `
# MikroTik Configuration for ${device.deviceName || device.serialNumber}
# Generated on ${new Date().toISOString()}

/system identity set name="${device.deviceName || device.serialNumber}"

# Set admin password
/user set admin password="${device.adminPassword || 'admin123'}"

# Configure VPN connection
${device.vpnIpAddress ? `/interface ovpn-client add name=vpn-fuelprice connect-to=pricepro.clubemkt.digital port=1194 user="${device.vpnUsername}" password="${device.vpnPassword}" certificate=none` : '# VPN not configured'}

# Configure WiFi
${device.wifiSsid ? `/interface wireless set [ find default-name=wlan1 ] ssid="${device.wifiSsid}" security-profile=default` : ''}
${device.wifiPassword ? `/interface wireless security-profiles set [ find default=yes ] authentication-types=wpa2-psk mode=dynamic-keys wpa2-pre-shared-key="${device.wifiPassword}"` : ''}
${device.wifiSsid ? `/interface wireless enable wlan1` : ''}

# Configure firewall for LED panel communication
/ip firewall filter add chain=forward action=accept protocol=tcp dst-port=502 comment="Modbus for LED panels"
/ip firewall filter add chain=forward action=accept protocol=tcp dst-port=80 comment="HTTP for LED panels"

# Configure NAT
/ip firewall nat add chain=srcnat action=masquerade out-interface=vpn-fuelprice

# LED Panel sync script
/system script add name=led-sync source={
  :log info "Syncing LED panels with server";
  /tool fetch url="https://pricepro.clubemkt.digital/api/stations/sync" mode=https;
}

# Schedule LED panel sync every 30 seconds
/system scheduler add name=led-panel-sync interval=30s on-event="/system script run led-sync"

# Enable services
/ip service enable telnet
/ip service enable ssh
/ip service enable www

:log info "Configuration completed for ${device.deviceName || device.serialNumber}";
    `.trim();

    return config;
  }

  private mapRowToDevice(row: any): MikroTikDevice {
    return {
      id: row.id,
      serialNumber: row.serial_number,
      model: row.model,
      macAddress: row.mac_address,
      clientId: row.client_id,
      deviceName: row.device_name,
      vpnIpAddress: row.vpn_ip_address,
      vpnUsername: row.vpn_username,
      vpnPassword: row.vpn_password,
      adminPassword: row.admin_password,
      wifiSsid: row.wifi_ssid,
      wifiPassword: row.wifi_password,
      status: row.status,
      deploymentDate: row.deployment_date,
      lastSeen: row.last_seen,
      locationAddress: row.location_address,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}