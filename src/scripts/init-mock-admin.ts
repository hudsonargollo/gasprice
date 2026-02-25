import bcrypt from 'bcryptjs';
import { getMockPool } from '../test/mockDatabase';
import { logger } from '../utils/logger';

/**
 * Initialize mock database with admin user
 * This script creates the admin user in the mock database for testing
 */
export async function initMockAdmin(): Promise<void> {
  try {
    const mockPool = getMockPool();
    if (!mockPool) {
      throw new Error('Mock database not initialized');
    }

    // Create admin user with bcrypt hash for password "admin123"
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);
    
    const client = await mockPool.connect();
    
    // Insert admin user
    const result = await client.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      ['admin', passwordHash, 'admin']
    );
    
    client.release();
    
    const user = result.rows[0];
    logger.info(`Mock admin user created: ${user.username} (${user.role}) - ID: ${user.id}`);
    
    return user;
  } catch (error) {
    logger.error('Failed to create mock admin user:', error);
    throw error;
  }
}

/**
 * Check if admin user exists in mock database
 */
export async function checkMockAdmin(): Promise<boolean> {
  try {
    const mockPool = getMockPool();
    if (!mockPool) {
      return false;
    }

    const client = await mockPool.connect();
    const result = await client.query(
      'SELECT id, username, role FROM users WHERE username = $1',
      ['admin']
    );
    client.release();
    
    const exists = result.rows.length > 0;
    if (exists) {
      logger.info(`Mock admin user exists: ${result.rows[0].username} (${result.rows[0].role})`);
    }
    
    return exists;
  } catch (error) {
    logger.error('Failed to check mock admin user:', error);
    return false;
  }
}