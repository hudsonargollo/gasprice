import { Pool } from 'pg';
import { Client } from '../types';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export class ClientModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createClient(clientData: Omit<Client, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Client & { username: string; password: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate username and password for the client
      const username = this.generateUsername(clientData.companyName);
      const password = this.generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user account first
      const userQuery = `
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, 'client')
        RETURNING id
      `;
      const userResult = await client.query(userQuery, [username, passwordHash]);
      const userId = userResult.rows[0].id;

      // Create client record
      const clientQuery = `
        INSERT INTO clients (user_id, company_name, contact_name, email, phone, address, items_purchased, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, user_id, company_name, contact_name, email, phone, address, items_purchased, status, notes, created_at, updated_at
      `;
      
      const clientResult = await client.query(clientQuery, [
        userId,
        clientData.companyName,
        clientData.contactName || null,
        clientData.email || null,
        clientData.phone || null,
        clientData.address || null,
        clientData.itemsPurchased,
        clientData.status,
        clientData.notes || null
      ]);
      
      await client.query('COMMIT');
      
      const row = clientResult.rows[0];
      logger.info(`Client and user created: ${clientData.companyName} (username: ${username})`);
      
      return {
        id: row.id,
        userId: row.user_id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        itemsPurchased: row.items_purchased,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        username,
        password
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating client:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private generateUsername(companyName: string): string {
    // Generate username from company name
    const base = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
    
    // Add random suffix to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}${suffix}`;
  }

  private generatePassword(): string {
    // Generate a secure random password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async findById(clientId: string): Promise<Client & { username?: string } | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT c.id, c.user_id, c.company_name, c.contact_name, c.email, c.phone, c.address, 
               c.items_purchased, c.status, c.notes, c.created_at, c.updated_at,
               u.username
        FROM clients c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
      `;
      
      const result = await client.query(query, [clientId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        itemsPurchased: row.items_purchased,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error finding client by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string): Promise<Client | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT c.id, c.user_id, c.company_name, c.contact_name, c.email, c.phone, c.address, 
               c.items_purchased, c.status, c.notes, c.created_at, c.updated_at
        FROM clients c
        WHERE c.user_id = $1
      `;
      
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        itemsPurchased: row.items_purchased,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error finding client by user ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllClients(): Promise<(Client & { username?: string })[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT c.id, c.user_id, c.company_name, c.contact_name, c.email, c.phone, c.address, 
               c.items_purchased, c.status, c.notes, c.created_at, c.updated_at,
               u.username
        FROM clients c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.company_name ASC
      `;
      
      const result = await client.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        itemsPurchased: row.items_purchased,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error getting all clients:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateClient(clientId: string, updates: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Client | null> {
    const client = await this.pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.companyName !== undefined) {
        setParts.push(`company_name = $${paramIndex++}`);
        values.push(updates.companyName);
      }
      
      if (updates.contactName !== undefined) {
        setParts.push(`contact_name = $${paramIndex++}`);
        values.push(updates.contactName);
      }
      
      if (updates.email !== undefined) {
        setParts.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }
      
      if (updates.phone !== undefined) {
        setParts.push(`phone = $${paramIndex++}`);
        values.push(updates.phone);
      }
      
      if (updates.address !== undefined) {
        setParts.push(`address = $${paramIndex++}`);
        values.push(updates.address);
      }
      
      if (updates.itemsPurchased !== undefined) {
        setParts.push(`items_purchased = $${paramIndex++}`);
        values.push(updates.itemsPurchased);
      }
      
      if (updates.status !== undefined) {
        setParts.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      
      if (updates.notes !== undefined) {
        setParts.push(`notes = $${paramIndex++}`);
        values.push(updates.notes);
      }

      if (setParts.length === 0) {
        return await this.findById(clientId);
      }

      values.push(clientId);
      
      const query = `
        UPDATE clients 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, company_name, contact_name, email, phone, address, items_purchased, status, notes, created_at, updated_at
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      logger.info(`Client updated: ${clientId}`);
      
      return {
        id: row.id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        itemsPurchased: row.items_purchased,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error updating client:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteClient(clientId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM clients WHERE id = $1`;
      const result = await client.query(query, [clientId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Client deleted: ${clientId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting client:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getClientStats(clientId: string): Promise<{
    totalDevices: number;
    activeDevices: number;
    totalStations: number;
    onlineStations: number;
  }> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT md.id) as total_devices,
          COUNT(DISTINCT CASE WHEN md.status IN ('online', 'deployed') THEN md.id END) as active_devices,
          COUNT(DISTINCT s.id) as total_stations,
          COUNT(DISTINCT CASE WHEN s.is_online = true THEN s.id END) as online_stations
        FROM clients c
        LEFT JOIN mikrotik_devices md ON c.id = md.client_id
        LEFT JOIN stations s ON c.id = s.client_id
        WHERE c.id = $1
      `;
      
      const result = await client.query(query, [clientId]);
      const row = result.rows[0];
      
      return {
        totalDevices: parseInt(row.total_devices) || 0,
        activeDevices: parseInt(row.active_devices) || 0,
        totalStations: parseInt(row.total_stations) || 0,
        onlineStations: parseInt(row.online_stations) || 0
      };
    } catch (error) {
      logger.error('Error getting client stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}