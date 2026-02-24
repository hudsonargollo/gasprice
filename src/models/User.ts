import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { User, LoginCredentials } from '../types';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export class UserModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createUser(username: string, password: string, role: 'admin' | 'owner'): Promise<User> {
    const client = await this.pool.connect();
    try {
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const query = `
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, $3)
        RETURNING id, username, password_hash, role, created_at, last_login, updated_at
      `;
      
      const result = await client.query(query, [username, passwordHash, role]);
      const user = result.rows[0];

      logger.info(`User created: ${username} with role: ${role}`);
      
      return {
        id: user.id,
        username: user.username,
        passwordHash: user.password_hash,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, username, password_hash, role, created_at, last_login, updated_at
        FROM users 
        WHERE username = $1
      `;
      
      const result = await client.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        username: user.username,
        passwordHash: user.password_hash,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, username, password_hash, role, created_at, last_login, updated_at
        FROM users 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        username: user.username,
        passwordHash: user.password_hash,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE users 
        SET last_login = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
      logger.info(`Updated last login for user: ${userId}`);
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  async getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, username, role, created_at, last_login, updated_at
        FROM users 
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query);
      
      return result.rows.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        updatedAt: user.updated_at
      }));
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM users WHERE id = $1`;
      const result = await client.query(query, [userId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`User deleted: ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}