// Test database configuration that uses mock when PostgreSQL is unavailable
import { Pool } from 'pg';
import { createMockPool } from '../test/mockDatabase';
import { logger } from '../utils/logger';

let pool: Pool;
let isUsingMock = false;

export async function connectTestDatabase(): Promise<void> {
  try {
    // Try to connect to real PostgreSQL first
    const realPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'fuelprice_pro_test',
      user: process.env.DB_USER || 'fuelprice_user',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await realPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    pool = realPool;
    isUsingMock = false;
    logger.info('Connected to real PostgreSQL database for testing');
    
    // Initialize schema for real database
    await initializeTestSchema();
  } catch (error) {
    logger.warn('PostgreSQL not available, using mock database for tests');
    pool = createMockPool();
    isUsingMock = true;
    
    // Initialize mock schema
    await initializeMockSchema();
  }
}

async function initializeTestSchema(): Promise<void> {
  if (isUsingMock) return;
  
  try {
    const client = await pool.connect();
    
    // Create tables (same as main database but for testing)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'owner')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        vpn_ip_address INET NOT NULL,
        is_online BOOLEAN DEFAULT FALSE,
        last_sync TIMESTAMP WITH TIME ZONE,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS led_panels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        regular_price DECIMAL(5, 2),
        premium_price DECIMAL(5, 2),
        diesel_price DECIMAL(5, 2),
        last_update TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    client.release();
    logger.info('Test database schema initialized');
  } catch (error) {
    logger.error('Test schema initialization failed:', error);
    throw error;
  }
}

async function initializeMockSchema(): Promise<void> {
  // Mock schema initialization - just test the connection
  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();
  logger.info('Mock database schema initialized');
}

export function getTestPool(): Pool {
  if (!pool) {
    throw new Error('Test database not initialized. Call connectTestDatabase() first.');
  }
  return pool;
}

export async function closeTestDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Test database connection closed');
  }
}

export function isUsingMockDatabase(): boolean {
  return isUsingMock;
}