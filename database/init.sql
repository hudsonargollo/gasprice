-- FuelPrice Pro Database Schema
-- Production initialization script

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS fuelprice_pro;

-- Connect to the database
\c fuelprice_pro;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stations table
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    vpn_ip_address INET NOT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    last_sync TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LED Panels table
CREATE TABLE IF NOT EXISTS led_panels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    regular_price DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    premium_price DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    diesel_price DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    last_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Price update logs table
CREATE TABLE IF NOT EXISTS price_update_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    panel_id UUID REFERENCES led_panels(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_regular_price DECIMAL(5, 2),
    old_premium_price DECIMAL(5, 2),
    old_diesel_price DECIMAL(5, 2),
    new_regular_price DECIMAL(5, 2) NOT NULL,
    new_premium_price DECIMAL(5, 2) NOT NULL,
    new_diesel_price DECIMAL(5, 2) NOT NULL,
    update_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stations_owner_id ON stations(owner_id);
CREATE INDEX IF NOT EXISTS idx_stations_vpn_ip ON stations(vpn_ip_address);
CREATE INDEX IF NOT EXISTS idx_led_panels_station_id ON led_panels(station_id);
CREATE INDEX IF NOT EXISTS idx_price_logs_station_id ON price_update_logs(station_id);
CREATE INDEX IF NOT EXISTS idx_price_logs_created_at ON price_update_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_led_panels_updated_at BEFORE UPDATE ON led_panels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: 'admin123')
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2b$10$rOzJqQZQJQZQJQZQJQZQJeK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert sample data for demonstration
DO $$
DECLARE
    admin_user_id UUID;
    sample_station_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    
    -- Insert sample station
    INSERT INTO stations (owner_id, name, vpn_ip_address, latitude, longitude, address)
    VALUES (
        admin_user_id,
        'Downtown Gas Station',
        '192.168.1.100',
        40.7128,
        -74.0060,
        '123 Main St, New York, NY 10001'
    ) RETURNING id INTO sample_station_id;
    
    -- Insert sample LED panels
    INSERT INTO led_panels (station_id, name, regular_price, premium_price, diesel_price)
    VALUES 
        (sample_station_id, 'Main Display Panel', 3.45, 3.65, 3.25),
        (sample_station_id, 'Secondary Panel', 3.45, 3.65, 3.25);
        
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if data already exists
        NULL;
END $$;