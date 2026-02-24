import { Pool } from 'pg';
import { HuiduDevice } from '../types';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export class HuiduDeviceModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createDevice(deviceData: Omit<HuiduDevice, 'id' | 'createdAt' | 'updatedAt'>): Promise<HuiduDevice> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO huidu_devices (
          serial_number, model, mac_address, client_id, device_name, 
          ip_address, admin_password, status, deployment_date, last_seen, 
          location_address, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        deviceData.serialNumber,
        deviceData.model,
        deviceData.macAddress,
        deviceData.clientId || null,
        deviceData.deviceName || null,
        deviceData.ipAddress || null,
        deviceData.adminPassword || null,
        deviceData.status,
        deviceData.deploymentDate || null,
        deviceData.lastSeen || null,
        deviceData.locationAddress || null,
        deviceData.notes || null
      ]);
      
      const row = result.rows[0];
      logger.info(`Huidu device created: ${deviceData.serialNumber}`);
      
      return this.mapRowToDevice(row);
    } catch (error) {
      logger.error('Error creating Huidu device:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(deviceId: string): Promise<HuiduDevice | null> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM huidu_devices WHERE id = $1`;
      const result = await client.query(query, [deviceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDevice(result.rows[0]);
    } catch (error) {
      logger.error('Error finding Huidu device by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findBySerialNumber(serialNumber: string): Promise<HuiduDevice | null> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM huidu_devices WHERE serial_number = $1`;
      const result = await client.query(query, [serialNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDevice(result.rows[0]);
    } catch (error) {
      logger.error('Error finding Huidu device by serial number:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByClientId(clientId: string): Promise<HuiduDevice[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM huidu_devices 
        WHERE client_id = $1 
        ORDER BY device_name ASC, serial_number ASC
      `;
      const result = await client.query(query, [clientId]);
      
      return result.rows.map(row => this.mapRowToDevice(row));
    } catch (error) {
      logger.error('Error finding Huidu devices by client ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllDevices(): Promise<HuiduDevice[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM huidu_devices 
        ORDER BY device_name ASC, serial_number ASC
      `;
      const result = await client.query(query);
      
      return result.rows.map(row => this.mapRowToDevice(row));
    } catch (error) {
      logger.error('Error getting all Huidu devices:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDevice(deviceId: string, updates: Partial<Omit<HuiduDevice, 'id' | 'createdAt' | 'updatedAt'>>): Promise<HuiduDevice | null> {
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
        ipAddress: 'ip_address',
        adminPassword: 'admin_password',
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
        UPDATE huidu_devices 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Huidu device updated: ${deviceId}`);
      return this.mapRowToDevice(result.rows[0]);
    } catch (error) {
      logger.error('Error updating Huidu device:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM huidu_devices WHERE id = $1`;
      const result = await client.query(query, [deviceId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Huidu device deleted: ${deviceId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting Huidu device:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToDevice(row: any): HuiduDevice {
    return {
      id: row.id,
      serialNumber: row.serial_number,
      model: row.model,
      macAddress: row.mac_address,
      clientId: row.client_id,
      deviceName: row.device_name,
      ipAddress: row.ip_address,
      adminPassword: row.admin_password,
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