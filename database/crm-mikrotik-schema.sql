-- CRM Integration and MikroTik Device Management Schema Extensions

-- CRM Clients table
CREATE TABLE IF NOT EXISTS crm_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_crm_id VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Brazil',
    items_purchased INTEGER DEFAULT 0,
    contract_start_date DATE,
    contract_end_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
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
    client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_name VARCHAR(255),
    vpn_ip_address INET,
    local_ip_address INET,
    public_ip_address INET,
    vpn_username VARCHAR(100),
    vpn_password VARCHAR(255),
    admin_password VARCHAR(255),
    wifi_ssid VARCHAR(100),
    wifi_password VARCHAR(255),
    firmware_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'manufactured' CHECK (status IN ('manufactured', 'configured', 'shipped', 'deployed', 'online', 'offline', 'maintenance', 'decommissioned')),
    deployment_date TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    location_address TEXT,
    configuration_template TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Configuration Templates
CREATE TABLE IF NOT EXISTS device_config_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model VARCHAR(100) NOT NULL,
    config_script TEXT NOT NULL,
    variables JSONB, -- Template variables like {vpn_server, dns_servers, etc}
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Deployment History
CREATE TABLE IF NOT EXISTS device_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES mikrotik_devices(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    deployed_by UUID REFERENCES users(id),
    deployment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    configuration_applied TEXT,
    deployment_notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed', 'replaced')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update stations table to link with MikroTik devices
ALTER TABLE stations ADD COLUMN IF NOT EXISTS mikrotik_device_id UUID REFERENCES mikrotik_devices(id);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES crm_clients(id);

-- CRM Import Logs
CREATE TABLE IF NOT EXISTS crm_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type VARCHAR(50) NOT NULL, -- 'clients', 'orders', 'devices'
    source_system VARCHAR(100) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_success INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    import_data JSONB,
    error_details TEXT,
    imported_by UUID REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
);

-- Device Monitoring Logs
CREATE TABLE IF NOT EXISTS device_monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES mikrotik_devices(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL, -- 'ping', 'ssh', 'api', 'vpn'
    status VARCHAR(20) NOT NULL, -- 'online', 'offline', 'error'
    response_time_ms INTEGER,
    error_message TEXT,
    additional_data JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_clients_external_id ON crm_clients(external_crm_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON crm_clients(status);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_serial ON mikrotik_devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_client ON mikrotik_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_mikrotik_devices_status ON mikrotik_devices(status);
CREATE INDEX IF NOT EXISTS idx_device_deployments_device ON device_deployments(device_id);
CREATE INDEX IF NOT EXISTS idx_device_deployments_station ON device_deployments(station_id);
CREATE INDEX IF NOT EXISTS idx_device_monitoring_device ON device_monitoring_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_monitoring_time ON device_monitoring_logs(checked_at);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crm_clients_updated_at BEFORE UPDATE ON crm_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mikrotik_devices_updated_at BEFORE UPDATE ON mikrotik_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_config_templates_updated_at BEFORE UPDATE ON device_config_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration template
INSERT INTO device_config_templates (name, description, model, config_script, variables, is_default) VALUES (
    'Standard hAP-ac2 Configuration',
    'Default configuration for hAP-ac2 devices with VPN, WiFi, and LED panel management',
    'hAP-ac2',
    '/system identity set name="{{device_name}}"
/ip address add address={{local_ip}}/24 interface=bridge
/ip route add gateway={{gateway}}
/ip dns set servers={{dns_servers}}
/interface wireless set [ find default-name=wlan1 ] ssid="{{wifi_ssid}}" security-profile=default
/interface wireless security-profiles set [ find default=yes ] authentication-types=wpa2-psk mode=dynamic-keys wpa2-pre-shared-key="{{wifi_password}}"
/interface wireless enable wlan1
/interface ovpn-client add name=vpn-client connect-to={{vpn_server}} port={{vpn_port}} user={{vpn_username}} password={{vpn_password}} certificate=none
/ip firewall nat add chain=srcnat action=masquerade out-interface=vpn-client
/system scheduler add name=led-panel-sync interval=30s on-event="/system script run led-sync"',
    '{"vpn_server": "pricepro.clubemkt.digital", "vpn_port": "1194", "dns_servers": "8.8.8.8,8.8.4.4", "gateway": "192.168.1.1"}',
    true
) ON CONFLICT DO NOTHING;