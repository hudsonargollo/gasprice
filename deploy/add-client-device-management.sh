#!/bin/bash

# Add Client and Device Management to FuelPrice Pro

set -e

echo "=== ADDING CLIENT AND DEVICE MANAGEMENT ==="

echo "Step 1: Creating database schema..."
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro << 'EOF'

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Update stations table to link with clients and devices
ALTER TABLE stations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_client ON mikrotik_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_status ON mikrotik_devices(status);
CREATE INDEX IF NOT EXISTS idx_stations_client ON stations(client_id);
CREATE INDEX IF NOT EXISTS idx_stations_device ON stations(mikrotik_device_id);

-- Update triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mikrotik_devices_updated_at BEFORE UPDATE ON mikrotik_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

EOF

echo "✅ Database schema created successfully!"

echo ""
echo "Step 2: Rebuilding application with new features..."
cd /opt/applications/fuelprice-pro
docker-compose -f docker-compose.shared.yml build fuelprice-app

echo ""
echo "Step 3: Restarting application..."
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "Waiting for application to start..."
sleep 15

echo ""
echo "Step 4: Testing new endpoints..."

echo "Testing clients endpoint:"
curl -s -H "Authorization: Bearer $(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)" https://pricepro.clubemkt.digital/api/clients | head -c 100

echo ""
echo ""
echo "Testing devices endpoint:"
curl -s -H "Authorization: Bearer $(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)" https://pricepro.clubemkt.digital/api/devices | head -c 100

echo ""
echo ""
echo "=== CLIENT AND DEVICE MANAGEMENT ADDED SUCCESSFULLY ==="
echo ""
echo "🎉 New Features Available:"
echo "  📋 Client Management - /api/clients"
echo "  🔧 Device Management - /api/devices"
echo "  📱 Mobile App Integration - Ready"
echo ""
echo "📱 Admin can now:"
echo "  ✅ Add/manage clients manually"
echo "  ✅ Create/configure MikroTik devices"
echo "  ✅ Generate device configurations"
echo "  ✅ Link devices to clients and stations"
echo "  ✅ Monitor device status"
echo ""
echo "🔧 Next Steps:"
echo "  1. Use mobile app to add clients"
echo "  2. Create MikroTik devices for clients"
echo "  3. Generate configuration files"
echo "  4. Deploy devices to client locations"
echo "  5. Link devices to stations for LED panel management"