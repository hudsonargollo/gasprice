#!/bin/bash

# Deploy Backend Update - Factory Provisioning
echo "🚀 Deploying backend update to VPS..."

# Connect to VPS and update backend
ssh root@vmi3098793.contaboserver.net << 'ENDSSH'
set -e

echo "📁 Navigating to application directory..."
cd /opt/applications/fuelprice-pro

echo "🔄 Pulling latest code from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building application..."
npm run build

echo "🗄️  Updating database schema..."
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro << 'SQLEOF'

-- Ensure factory provisioning tables exist
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
    status VARCHAR(50) DEFAULT 'configured',
    deployment_date TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    location_address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS huidu_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'HD-W60',
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    ip_address INET,
    admin_password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'configured',
    deployment_date TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    location_address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing tables
ALTER TABLE stations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);
ALTER TABLE led_panels ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);
ALTER TABLE led_panels ADD COLUMN IF NOT EXISTS huidu_device_id UUID REFERENCES huidu_devices(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_client ON mikrotik_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_huidu_devices_client ON huidu_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_stations_client ON stations(client_id);

SQLEOF

echo "🔄 Restarting application..."
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "⏳ Waiting for application to start..."
sleep 30

echo "🧪 Testing factory provisioning endpoints..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://pricepro.clubemkt.digital/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Application is running"
    
    # Test login
    TOKEN=$(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' | \
        grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$TOKEN" ]; then
        echo "✅ Admin login successful"
        
        # Test factory provisioning endpoint
        FACTORY_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            https://pricepro.clubemkt.digital/api/factory/wizard/steps)
        
        if [ "$FACTORY_TEST" = "200" ]; then
            echo "✅ Factory provisioning endpoints working"
        else
            echo "❌ Factory provisioning endpoints failed (HTTP $FACTORY_TEST)"
        fi
    else
        echo "❌ Admin login failed"
    fi
else
    echo "❌ Application health check failed (HTTP $HEALTH_CHECK)"
fi

echo ""
echo "🎉 BACKEND UPDATE COMPLETED!"
echo "🌐 API: https://pricepro.clubemkt.digital"
echo ""

ENDSSH

echo "✅ Backend deployment completed!"