# Quick Deploy Instructions

## 1. Deploy to VPS (Run this command):

```bash
ssh root@vmi3098793.contaboserver.net "cd /opt/applications/fuelprice-pro && cat > deploy/quick-deploy.sh << 'EOF'
#!/bin/bash
set -e
echo '=== QUICK FACTORY PROVISIONING DEPLOYMENT ==='

# Update database
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
    status VARCHAR(50) DEFAULT 'active',
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
SQLEOF

echo '✅ Database updated'

# Rebuild and restart
docker-compose -f docker-compose.shared.yml build fuelprice-app
docker-compose -f docker-compose.shared.yml restart fuelprice-app
sleep 20

# Test
TOKEN=\$(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}' | grep -o '\"token\":\"[^\"]*\"' | cut -d'\"' -f4)

RESPONSE=\$(curl -s -H \"Authorization: Bearer \$TOKEN\" -H \"Content-Type: application/json\" -X POST https://pricepro.clubemkt.digital/api/factory/provision -d '{
  \"clientInfo\": {
    \"companyName\": \"Test Mobile Gas\",
    \"contactName\": \"Mobile User\",
    \"email\": \"mobile@test.com\",
    \"phone\": \"+1-555-MOBILE\",
    \"itemsPurchased\": 1
  },
  \"locations\": [
    {
      \"stationInfo\": {
        \"name\": \"Mobile Test Station\",
        \"location\": {
          \"latitude\": 40.7128,
          \"longitude\": -74.0060,
          \"address\": \"Mobile Test Address\"
        }
      },
      \"devices\": {
        \"mikrotik\": {
          \"serialNumber\": \"MT-MOBILE-001\",
          \"macAddress\": \"AA:BB:CC:DD:EE:01\"
        },
        \"huidu\": {
          \"serialNumber\": \"HD-MOBILE-001\",
          \"macAddress\": \"AA:BB:CC:DD:EE:02\"
        }
      },
      \"ledPanels\": [
        {\"name\": \"Mobile Display\"}
      ]
    }
  ]
}')

if echo \"\$RESPONSE\" | grep -q '\"success\":true'; then
    USERNAME=\$(echo \"\$RESPONSE\" | grep -o '\"username\":\"[^\"]*\"' | cut -d'\"' -f4)
    PASSWORD=\$(echo \"\$RESPONSE\" | grep -o '\"password\":\"[^\"]*\"' | cut -d'\"' -f4)
    echo '🎉 SUCCESS! Mobile test client created:'
    echo \"  Username: \$USERNAME\"
    echo \"  Password: \$PASSWORD\"
    echo '📱 Ready for Expo Go testing!'
else
    echo '❌ Test failed'
fi
EOF
chmod +x deploy/quick-deploy.sh && ./deploy/quick-deploy.sh"
```

## 2. Start Mobile App (Run in mobile folder):

```bash
cd mobile
npm start
```

Then scan QR code with Expo Go app on your phone.

## 3. Test Credentials

After deployment, you'll get test client credentials to login in the mobile app and see the factory provisioning features working!