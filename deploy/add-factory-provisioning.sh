#!/bin/bash

# Add Factory Provisioning System to FuelPrice Pro

set -e

echo "=== ADDING FACTORY PROVISIONING SYSTEM ==="

echo "Step 1: Updating database schema for factory provisioning..."
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro << 'SQLEOF'

-- Update users table to support client role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['admin'::character varying, 'owner'::character varying, 'client'::character varying]::text[]));

-- Clients table with user account link
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    items_purchased INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MikroTik Devices table
CREATE TABLE IF NOT EXISTS mikrotik_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'hAP-ac2',
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    vpn_ip_address INET,
    vpn_username VARCHAR(100),
    vpn_password VARCHAR(255),
    admin_password VARCHAR(255),
    wifi_ssid VARCHAR(100),
    wifi_password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'configured' CHECK (status IN ('configured', 'shipped', 'deployed', 'online', 'offline', 'maintenance')),
    deployment_date TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    location_address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Huidu Devices table (HD-W60 LED controllers)
CREATE TABLE IF NOT EXISTS huidu_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'HD-W60',
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    ip_address INET,
    admin_password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'configured' CHECK (status IN ('configured', 'shipped', 'deployed', 'online', 'offline', 'maintenance')),
    deployment_date TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    location_address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Factory Provisioning Orders table
CREATE TABLE IF NOT EXISTS factory_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'testing', 'completed', 'shipped', 'failed')),
    provisioned_by UUID REFERENCES users(id),
    provisioning_data JSONB,
    qr_code TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Update stations table to link with clients and devices
ALTER TABLE stations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);

-- Update LED panels table to link with both device types
ALTER TABLE led_panels ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);
ALTER TABLE led_panels ADD COLUMN IF NOT EXISTS huidu_device_id UUID REFERENCES huidu_devices(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_client ON mikrotik_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_status ON mikrotik_devices(status);
CREATE INDEX IF NOT EXISTS idx_huidu_devices_client ON huidu_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_huidu_devices_status ON huidu_devices(status);
CREATE INDEX IF NOT EXISTS idx_factory_orders_status ON factory_orders(status);
CREATE INDEX IF NOT EXISTS idx_factory_orders_client ON factory_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_stations_client ON stations(client_id);
CREATE INDEX IF NOT EXISTS idx_stations_device ON stations(mikrotik_device_id);
CREATE INDEX IF NOT EXISTS idx_led_panels_mikrotik ON led_panels(mikrotik_device_id);
CREATE INDEX IF NOT EXISTS idx_led_panels_huidu ON led_panels(huidu_device_id);

-- Update triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mikrotik_devices_updated_at BEFORE UPDATE ON mikrotik_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_huidu_devices_updated_at BEFORE UPDATE ON huidu_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SQLEOF

echo "✅ Factory provisioning database schema created successfully!"

echo ""
echo "Step 2: Rebuilding application with factory provisioning..."
cd /opt/applications/fuelprice-pro
docker-compose -f docker-compose.shared.yml build fuelprice-app

echo ""
echo "Step 3: Restarting application..."
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "Waiting for application to start..."
sleep 15

echo ""
echo "Step 4: Testing factory provisioning endpoints..."

# Get auth token
TOKEN=$(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Testing factory wizard steps:"
curl -s -H "Authorization: Bearer $TOKEN" https://pricepro.clubemkt.digital/api/factory/wizard/steps | head -c 200

echo ""
echo ""
echo "Testing multi-device test endpoint:"
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -X POST https://pricepro.clubemkt.digital/api/factory/test-multiple-devices -d '{"devicePairs":[{"mikrotikSerial":"TEST001","huiduSerial":"TEST002","locationName":"Location 1"}]}' | head -c 200

echo ""
echo ""
echo "=== FACTORY PROVISIONING SYSTEM DEPLOYED ==="
echo ""
echo "🏭 Factory Provisioning Features:"
echo "  📋 Complete Setup Wizard - /api/factory/wizard/steps"
echo "  🔧 Single Device Testing - /api/factory/test-devices"
echo "  🔧 Multi-Device Testing - /api/factory/test-multiple-devices"
echo "  ⚡ Multi-Location Provisioning - /api/factory/provision"
echo "  📦 Configuration Download - /api/factory/config/:clientId"
echo "  📊 Provisioning Status - /api/factory/status/:clientId"
echo ""
echo "🏭 Multi-Location Factory Workflow:"
echo "  1. Receive client order (multiple locations)"
echo "  2. Register device pairs for each location"
echo "  3. Test all device pairs"
echo "  4. Run multi-location provisioning wizard"
echo "  5. Generate configurations for all locations"
echo "  6. Create QR code for client (all stations)"
echo "  7. Package and ship all devices"
echo ""
echo "📱 Multi-Location Provisioning Wizard Steps:"
echo "  Step 1: Client Information"
echo "  Step 2: Location Planning (how many locations)"
echo "  Step 3: Location Setup (repeat for each location)"
echo "  Step 4: Device Registration (MikroTik + Huidu per location)"
echo "  Step 5: Device Testing (test all device pairs)"
echo "  Step 6: Complete Provisioning (all locations at once)"
echo "  Step 7: Download Configurations (per location)"
echo ""
echo "📦 What Gets Created Per Location:"
echo "  • Unique VPN IP address (10.8.x.x range)"
echo "  • MikroTik device + location-specific config"
echo "  • Huidu device + IP settings"
echo "  • Station + location info"
echo "  • LED panels + device links"
echo ""
echo "📦 What Gets Created Per Client:"
echo "  • Single client account + login credentials"
echo "  • Access to all their locations"
echo "  • QR code with all station IDs"
echo ""
echo "🎯 Multi-Location Architecture:"
echo "  • Each location: 1 MikroTik + 1 Huidu + N LED panels"
echo "  • Each location gets unique VPN IP"
echo "  • Client gets one login for all locations"
echo "  • Mobile app shows all client's stations"
echo ""
echo "🎯 Ready for Factory Use!"
echo "  Admin can now use the mobile app to:"
echo "  1. Run the provisioning wizard"
echo "  2. Test devices before shipping"
echo "  3. Generate all configuration files"
echo "  4. Provide QR code to clients"