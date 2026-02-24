# Quick Factory Provisioning Deployment

## Run this single command on your VPS:

```bash
ssh root@vmi3098793.contaboserver.net "cd /opt/applications/fuelprice-pro && curl -s https://raw.githubusercontent.com/your-repo/main/deploy/complete-factory-deployment.sh | bash"
```

## Or manually:

```bash
# SSH to VPS
ssh root@vmi3098793.contaboserver.net

# Navigate to app directory
cd /opt/applications/fuelprice-pro

# Create and run deployment script
cat > deploy/complete-factory-deployment.sh << 'EOF'
#!/bin/bash
set -e
echo "=== FAST TRACK FACTORY PROVISIONING DEPLOYMENT ==="
DOMAIN="pricepro.clubemkt.digital"

echo "Step 1: Updating database schema..."
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro << 'SQLEOF'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['admin'::character varying, 'owner'::character varying, 'client'::character varying]::text[]));

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

ALTER TABLE stations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);
ALTER TABLE led_panels ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);
ALTER TABLE led_panels ADD COLUMN IF NOT EXISTS huidu_device_id UUID REFERENCES huidu_devices(id);

CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_client ON mikrotik_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_huidu_devices_client ON huidu_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_stations_client ON stations(client_id);
SQLEOF

echo "✅ Database updated"

echo "Step 2: Rebuilding app..."
docker-compose -f docker-compose.shared.yml build fuelprice-app
docker-compose -f docker-compose.shared.yml restart fuelprice-app
sleep 20

echo "Step 3: Testing..."
TOKEN=$(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

PROVISIONING_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -X POST https://pricepro.clubemkt.digital/api/factory/provision -d '{
  "clientInfo": {
    "companyName": "Quick Test Gas",
    "contactName": "Test User",
    "email": "test@quickgas.com",
    "phone": "+1-555-TEST",
    "itemsPurchased": 1
  },
  "locations": [
    {
      "stationInfo": {
        "name": "Test Station",
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060,
          "address": "123 Test St"
        }
      },
      "devices": {
        "mikrotik": {
          "serialNumber": "MT-QUICK-TEST",
          "macAddress": "AA:BB:CC:DD:EE:FF"
        },
        "huidu": {
          "serialNumber": "HD-QUICK-TEST",
          "macAddress": "AA:BB:CC:DD:EE:FE"
        }
      },
      "ledPanels": [
        {"name": "Test Display"}
      ]
    }
  ]
}')

if echo "$PROVISIONING_RESPONSE" | grep -q '"success":true'; then
    CLIENT_USERNAME=$(echo "$PROVISIONING_RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    CLIENT_PASSWORD=$(echo "$PROVISIONING_RESPONSE" | grep -o '"password":"[^"]*"' | cut -d'"' -f4)
    echo "🎉 SUCCESS! Test client created:"
    echo "  Username: $CLIENT_USERNAME"
    echo "  Password: $CLIENT_PASSWORD"
    echo "📱 Ready for mobile app testing!"
else
    echo "❌ Test failed"
fi
EOF

chmod +x deploy/complete-factory-deployment.sh
./deploy/complete-factory-deployment.sh
```

This will:
1. Update the database schema
2. Rebuild the app with new factory provisioning code
3. Create a test client account
4. Give you credentials to test in the mobile app

The whole process should take about 2-3 minutes.