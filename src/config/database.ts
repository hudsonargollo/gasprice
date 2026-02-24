import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';
import { createMockPool } from '../test/mockDatabase';

let pool: Pool;
let usingMockDatabase = false;

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fuelprice_pro',
  user: process.env.DB_USER || 'fuelprice_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export async function connectDatabase(): Promise<void> {
  try {
    // Check if we should use mock database
    if (process.env.DATABASE_URL?.startsWith('mock://') || process.env.NODE_ENV === 'test') {
      logger.warn('PostgreSQL not available, using mock database for tests');
      pool = createMockPool();
      usingMockDatabase = true;
      logger.info('Mock database schema initialized');
      return;
    }

    // Try to connect to PostgreSQL
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connection established');
    
    // Initialize database schema
    await initializeSchema();
  } catch (error) {
    logger.warn('PostgreSQL connection failed, falling back to mock database:', error);
    
    // Fall back to mock database
    pool = createMockPool();
    usingMockDatabase = true;
    logger.info('Mock database schema initialized');
  }
}

export async function initializeSchema(): Promise<void> {
  // Skip schema initialization for mock database
  if (usingMockDatabase) {
    logger.info('Using mock database - schema initialization skipped');
    return;
  }

  try {
    const client = await pool.connect();
    
    // Create users table
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

    // Create stations table
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

    // Create led_panels table
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

    // Create price_update_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS price_update_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
        panel_id UUID REFERENCES led_panels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_prices JSONB,
        new_prices JSONB NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stations_owner_id ON stations(owner_id);
      CREATE INDEX IF NOT EXISTS idx_stations_vpn_ip ON stations(vpn_ip_address);
      CREATE INDEX IF NOT EXISTS idx_led_panels_station_id ON led_panels(station_id);
      CREATE INDEX IF NOT EXISTS idx_price_logs_station_id ON price_update_logs(station_id);
      CREATE INDEX IF NOT EXISTS idx_price_logs_created_at ON price_update_logs(created_at);
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at columns
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_stations_updated_at ON stations;
      CREATE TRIGGER update_stations_updated_at 
        BEFORE UPDATE ON stations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_led_panels_updated_at ON led_panels;
      CREATE TRIGGER update_led_panels_updated_at 
        BEFORE UPDATE ON led_panels 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    client.release();
    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Schema initialization failed:', error);
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}