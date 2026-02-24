import { Pool } from 'pg';
import { LEDPanel, FuelPrices } from '../types';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export class LEDPanelModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createPanel(
    stationId: string,
    name: string,
    initialPrices?: FuelPrices
  ): Promise<LEDPanel> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO led_panels (station_id, name, regular_price, premium_price, diesel_price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, station_id, name, regular_price, premium_price, diesel_price,
                  last_update, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        stationId,
        name,
        initialPrices?.regular || null,
        initialPrices?.premium || null,
        initialPrices?.diesel || null
      ]);
      
      const panel = result.rows[0];
      logger.info(`LED Panel created: ${name} for station: ${stationId}`);
      
      return {
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
      };
    } catch (error) {
      logger.error('Error creating LED panel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(panelId: string): Promise<LEDPanel | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, station_id, name, regular_price, premium_price, diesel_price,
               last_update, created_at, updated_at
        FROM led_panels 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [panelId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const panel = result.rows[0];
      return {
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
      };
    } catch (error) {
      logger.error('Error finding LED panel by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByStationId(stationId: string): Promise<LEDPanel[]> {
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
      logger.error('Error finding LED panels by station ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePrices(
    panelId: string,
    newPrices: FuelPrices
  ): Promise<LEDPanel | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE led_panels 
        SET regular_price = $1, premium_price = $2, diesel_price = $3, last_update = NOW()
        WHERE id = $4
        RETURNING id, station_id, name, regular_price, premium_price, diesel_price,
                  last_update, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        newPrices.regular,
        newPrices.premium,
        newPrices.diesel,
        panelId
      ]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const panel = result.rows[0];
      logger.info(`LED Panel prices updated: ${panelId}`);
      
      return {
        id: panel.id,
        stationId: panel.station_id,
        name: panel.name,
        currentPrices: {
          regular: parseFloat(panel.regular_price),
          premium: parseFloat(panel.premium_price),
          diesel: parseFloat(panel.diesel_price)
        },
        lastUpdate: panel.last_update,
        createdAt: panel.created_at,
        updatedAt: panel.updated_at
      };
    } catch (error) {
      logger.error('Error updating LED panel prices:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePanelsByStationId(
    stationId: string,
    newPrices: FuelPrices
  ): Promise<LEDPanel[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE led_panels 
        SET regular_price = $1, premium_price = $2, diesel_price = $3, last_update = NOW()
        WHERE station_id = $4
        RETURNING id, station_id, name, regular_price, premium_price, diesel_price,
                  last_update, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        newPrices.regular,
        newPrices.premium,
        newPrices.diesel,
        stationId
      ]);
      
      logger.info(`All LED panels updated for station: ${stationId}`);
      
      return result.rows.map(panel => ({
        id: panel.id,
        stationId: panel.station_id,
        name: panel.name,
        currentPrices: {
          regular: parseFloat(panel.regular_price),
          premium: parseFloat(panel.premium_price),
          diesel: parseFloat(panel.diesel_price)
        },
        lastUpdate: panel.last_update,
        createdAt: panel.created_at,
        updatedAt: panel.updated_at
      }));
    } catch (error) {
      logger.error('Error updating LED panels by station ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePanel(
    panelId: string,
    updates: Partial<Pick<LEDPanel, 'name'>>
  ): Promise<LEDPanel | null> {
    const client = await this.pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setParts.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (setParts.length === 0) {
        return await this.findById(panelId);
      }

      values.push(panelId);
      
      const query = `
        UPDATE led_panels 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, station_id, name, regular_price, premium_price, diesel_price,
                  last_update, created_at, updated_at
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const panel = result.rows[0];
      logger.info(`LED Panel updated: ${panelId}`);
      
      return {
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
      };
    } catch (error) {
      logger.error('Error updating LED panel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePanel(panelId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM led_panels WHERE id = $1`;
      const result = await client.query(query, [panelId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`LED Panel deleted: ${panelId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting LED panel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePanelsByStationId(stationId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM led_panels WHERE station_id = $1`;
      const result = await client.query(query, [stationId]);
      
      const deletedCount = result.rowCount || 0;
      logger.info(`${deletedCount} LED panels deleted for station: ${stationId}`);
      return deletedCount;
    } catch (error) {
      logger.error('Error deleting LED panels by station ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}