import { Pool } from 'pg';
import { Station, LEDPanel, FuelPrices } from '../types';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export class StationModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createStation(
    ownerId: string,
    name: string,
    vpnIpAddress: string,
    location?: { latitude: number; longitude: number; address: string }
  ): Promise<Station> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO stations (owner_id, name, vpn_ip_address, latitude, longitude, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, owner_id, name, vpn_ip_address, is_online, last_sync, 
                  latitude, longitude, address, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        ownerId,
        name,
        vpnIpAddress,
        location?.latitude || null,
        location?.longitude || null,
        location?.address || null
      ]);
      
      const station = result.rows[0];
      logger.info(`Station created: ${name} for owner: ${ownerId}`);
      
      return {
        id: station.id,
        ownerId: station.owner_id,
        name: station.name,
        vpnIpAddress: station.vpn_ip_address,
        isOnline: station.is_online,
        lastSync: station.last_sync,
        location: station.latitude && station.longitude ? {
          latitude: parseFloat(station.latitude),
          longitude: parseFloat(station.longitude),
          address: station.address
        } : undefined,
        panels: [], // Will be populated by separate query
        createdAt: station.created_at,
        updatedAt: station.updated_at
      };
    } catch (error) {
      logger.error('Error creating station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(stationId: string): Promise<Station | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, owner_id, name, vpn_ip_address, is_online, last_sync,
               latitude, longitude, address, created_at, updated_at
        FROM stations 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [stationId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const station = result.rows[0];
      const panels = await this.getPanelsByStationId(stationId);
      
      return {
        id: station.id,
        ownerId: station.owner_id,
        name: station.name,
        vpnIpAddress: station.vpn_ip_address,
        isOnline: station.is_online,
        lastSync: station.last_sync,
        location: station.latitude && station.longitude ? {
          latitude: parseFloat(station.latitude),
          longitude: parseFloat(station.longitude),
          address: station.address
        } : undefined,
        panels,
        createdAt: station.created_at,
        updatedAt: station.updated_at
      };
    } catch (error) {
      logger.error('Error finding station by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByOwnerId(ownerId: string): Promise<Station[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, owner_id, name, vpn_ip_address, is_online, last_sync,
               latitude, longitude, address, created_at, updated_at
        FROM stations 
        WHERE owner_id = $1
        ORDER BY name ASC
      `;
      
      const result = await client.query(query, [ownerId]);
      
      const stations: Station[] = [];
      for (const row of result.rows) {
        const panels = await this.getPanelsByStationId(row.id);
        
        stations.push({
          id: row.id,
          ownerId: row.owner_id,
          name: row.name,
          vpnIpAddress: row.vpn_ip_address,
          isOnline: row.is_online,
          lastSync: row.last_sync,
          location: row.latitude && row.longitude ? {
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            address: row.address
          } : undefined,
          panels,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
      
      return stations;
    } catch (error) {
      logger.error('Error finding stations by owner ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllStations(): Promise<Station[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, owner_id, name, vpn_ip_address, is_online, last_sync,
               latitude, longitude, address, created_at, updated_at
        FROM stations 
        ORDER BY name ASC
      `;
      
      const result = await client.query(query);
      
      const stations: Station[] = [];
      for (const row of result.rows) {
        const panels = await this.getPanelsByStationId(row.id);
        
        stations.push({
          id: row.id,
          ownerId: row.owner_id,
          name: row.name,
          vpnIpAddress: row.vpn_ip_address,
          isOnline: row.is_online,
          lastSync: row.last_sync,
          location: row.latitude && row.longitude ? {
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            address: row.address
          } : undefined,
          panels,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
      
      return stations;
    } catch (error) {
      logger.error('Error getting all stations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStationStatus(stationId: string, isOnline: boolean, lastSync?: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE stations 
        SET is_online = $1, last_sync = $2
        WHERE id = $3
      `;
      
      await client.query(query, [isOnline, lastSync || new Date(), stationId]);
      logger.info(`Station status updated: ${stationId} - Online: ${isOnline}`);
    } catch (error) {
      logger.error('Error updating station status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStation(
    stationId: string,
    updates: Partial<Pick<Station, 'name' | 'vpnIpAddress' | 'location'>>
  ): Promise<Station | null> {
    const client = await this.pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setParts.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      
      if (updates.vpnIpAddress !== undefined) {
        setParts.push(`vpn_ip_address = $${paramIndex++}`);
        values.push(updates.vpnIpAddress);
      }
      
      if (updates.location !== undefined) {
        setParts.push(`latitude = $${paramIndex++}`);
        values.push(updates.location.latitude);
        setParts.push(`longitude = $${paramIndex++}`);
        values.push(updates.location.longitude);
        setParts.push(`address = $${paramIndex++}`);
        values.push(updates.location.address);
      }

      if (setParts.length === 0) {
        return await this.findById(stationId);
      }

      values.push(stationId);
      
      const query = `
        UPDATE stations 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, owner_id, name, vpn_ip_address, is_online, last_sync,
                  latitude, longitude, address, created_at, updated_at
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const station = result.rows[0];
      const panels = await this.getPanelsByStationId(stationId);
      
      logger.info(`Station updated: ${stationId}`);
      
      return {
        id: station.id,
        ownerId: station.owner_id,
        name: station.name,
        vpnIpAddress: station.vpn_ip_address,
        isOnline: station.is_online,
        lastSync: station.last_sync,
        location: station.latitude && station.longitude ? {
          latitude: parseFloat(station.latitude),
          longitude: parseFloat(station.longitude),
          address: station.address
        } : undefined,
        panels,
        createdAt: station.created_at,
        updatedAt: station.updated_at
      };
    } catch (error) {
      logger.error('Error updating station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteStation(stationId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM stations WHERE id = $1`;
      const result = await client.query(query, [stationId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Station deleted: ${stationId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async getPanelsByStationId(stationId: string): Promise<LEDPanel[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, station_id, name, regular_price, premium_price, diesel_price,
               last_update, created_at, updated_at
        FROM led_panels 
        WHERE station_id = $1
        ORDER BY name ASC
      `;
      
      const result = await client.query(query, [stationId]);
      
      return result.rows.map(panel => ({
        id: panel.id,
        stationId: panel.station_id,
        name: panel.name,
        currentPrices: {
          regular: panel.regular_price ? parseFloat(panel.regular_price) : 0,
          premium: panel.premium_price ? parseFloat(panel.premium_price) : 0,
          diesel: panel.diesel_price ? parseFloat(panel.diesel_price) : 0
        },
        lastUpdate: panel.last_update,
        createdAt: panel.created_at,
        updatedAt: panel.updated_at
      }));
    } catch (error) {
      logger.error('Error getting panels by station ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}