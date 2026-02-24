# 🏗️ Technical Architecture: MikroTik + Huidu LED Control System

## Overview
This document explains how the factory provisioning system creates a complete fuel station setup with MikroTik routers and Huidu LED controllers working together to display real-time fuel prices.

## 🔧 Device Architecture

### Per Location Setup:
```
Internet → MikroTik Router → Huidu Controller → LED Panels
    ↓           ↓                ↓               ↓
  VPN to      Local WiFi      TCP/IP         Price Display
  Server      Network       Communication    on LED Panels
```

## 📡 Communication Flow

### 1. Price Update Initiation
```
Mobile App → API Server → Database → VPN Monitor → MikroTik → Huidu → LED Panels
```

**Step-by-step:**
1. **Mobile App**: Admin/Client updates prices via mobile interface
2. **API Server**: Receives price update request, validates, stores in database
3. **VPN Monitor**: Checks if station's MikroTik router is online via VPN
4. **MikroTik Router**: Receives price update command via VPN tunnel
5. **Huidu Controller**: Gets price data from MikroTik via local network
6. **LED Panels**: Display updated prices in real-time

### 2. Device Provisioning Process

#### MikroTik Router Configuration:
```bash
# VPN Connection to Central Server
/interface ovpn-client add name=vpn-fuelprice connect-to=pricepro.clubemkt.digital

# Local Network for Huidu Device
/ip address add address=192.168.1.1/24 interface=ether2

# WiFi Network for Management
/interface wireless set wlan1 ssid="StationName-WiFi"

# Firewall Rules for LED Communication
/ip firewall filter add chain=forward action=accept protocol=tcp dst-port=5005
```

#### Huidu Controller Setup:
- **IP Address**: `192.168.1.100` (assigned by MikroTik DHCP)
- **TCP Port**: `5005` (for receiving price updates)
- **Protocol**: Custom Huidu protocol with CRC16 validation
- **LED Panels**: Connected via RS485 or Ethernet

## 🔌 Technical Implementation

### 1. Factory Provisioning Creates:

**Database Records:**
```sql
-- Client account with login credentials
INSERT INTO clients (company_name, user_id, ...) VALUES (...);

-- MikroTik device with VPN configuration
INSERT INTO mikrotik_devices (
  serial_number, mac_address, vpn_ip_address, 
  vpn_username, vpn_password, wifi_ssid, wifi_password
) VALUES (...);

-- Huidu device with network settings
INSERT INTO huidu_devices (
  serial_number, mac_address, ip_address, admin_password
) VALUES (...);

-- Station linking devices together
INSERT INTO stations (
  client_id, mikrotik_device_id, vpn_ip_address
) VALUES (...);

-- LED panels linked to both devices
INSERT INTO led_panels (
  station_id, mikrotik_device_id, huidu_device_id, name
) VALUES (...);
```

**Configuration Files:**
- **MikroTik Script**: Complete RouterOS configuration
- **Huidu Settings**: IP address and communication parameters
- **VPN Certificates**: Secure tunnel credentials
- **WiFi Credentials**: Local network access

### 2. Price Update Protocol

#### Huidu Protocol Frame Structure:
```
[STX][CMD][LEN][DATA][CRC16][ETX]
 02   31   XX   JSON   XXXX   03

STX    = 0x02 (Start of Text)
CMD    = 0x31 (Price Update Command)  
LEN    = Data length (2 bytes, big-endian)
DATA   = JSON price data
CRC16  = Checksum for data integrity
ETX    = 0x03 (End of Text)
```

#### Price Data JSON Format:
```json
{
  "panelId": "panel-001",
  "timestamp": "2026-02-24T10:30:00.000Z",
  "prices": {
    "regular": "3.45",
    "premium": "3.65", 
    "diesel": "3.25"
  }
}
```

### 3. Network Architecture

#### VPN Network (10.8.x.x):
- **Central Server**: `10.8.0.1`
- **Location 1**: `10.8.1.1` (MikroTik), `10.8.1.101` (Huidu)
- **Location 2**: `10.8.1.2` (MikroTik), `10.8.1.102` (Huidu)
- **Location N**: `10.8.1.N` (MikroTik), `10.8.1.(N+100)` (Huidu)

#### Local Network (192.168.1.x):
- **MikroTik Gateway**: `192.168.1.1`
- **Huidu Controller**: `192.168.1.100`
- **Management WiFi**: `192.168.1.2-50`
- **LED Panels**: `192.168.1.101-200`

## 🔄 Real-Time Operation

### 1. Price Update Flow:
```typescript
// 1. Mobile app sends price update
const priceUpdate = {
  stationId: "station-123",
  prices: { regular: 3.45, premium: 3.65, diesel: 3.25 }
};

// 2. API validates and stores
await stationService.updatePrices(stationId, prices);

// 3. LED Communication Service sends to Huidu
const huiduFrame = huiduProtocol.createPriceUpdateFrame(prices);
await ledService.sendTCPFrame(huiduIpAddress, 5005, huiduFrame);

// 4. Huidu controller updates LED panels
// 5. LED panels display new prices immediately
```

### 2. Device Monitoring:
```typescript
// VPN connectivity monitoring
const vpnStatus = await vpnMonitor.checkConnection(stationId);

// Device health checks
const deviceStatus = await mikrotikDevice.ping();
const huiduStatus = await huiduDevice.healthCheck();

// LED panel status
const panelStatus = await ledPanel.getDisplayStatus();
```

## 🛠️ Factory Setup Process

### 1. Physical Installation:
1. **MikroTik Router**: Connect to internet, power on
2. **Huidu Controller**: Connect to MikroTik LAN port
3. **LED Panels**: Connect to Huidu controller via RS485/Ethernet
4. **Power**: Ensure all devices have stable power supply

### 2. Configuration Deployment:
1. **MikroTik**: Load generated RouterOS script via Winbox/SSH
2. **Huidu**: Configure IP address and communication settings
3. **VPN**: Establish secure tunnel to central server
4. **Testing**: Verify price updates work end-to-end

### 3. Client Handover:
1. **QR Code**: Contains login credentials and setup info
2. **Mobile App**: Client scans QR code to access their stations
3. **Training**: Show client how to update prices
4. **Support**: Provide technical support contact

## 🔐 Security Features

### 1. Network Security:
- **VPN Encryption**: All communication encrypted via OpenVPN
- **Firewall Rules**: Only necessary ports open
- **MAC Address Filtering**: Device-level access control
- **WiFi Security**: WPA2 encryption for management access

### 2. Device Authentication:
- **Serial Number Validation**: Devices must match registered serials
- **MAC Address Verification**: Hardware-level identification
- **VPN Certificates**: Cryptographic device authentication
- **Admin Passwords**: Unique passwords per device

### 3. Protocol Security:
- **CRC16 Checksums**: Data integrity validation
- **Frame Validation**: Protocol compliance checking
- **Timeout Handling**: Prevents hanging connections
- **Error Recovery**: Automatic retry mechanisms

## 📊 Monitoring & Diagnostics

### 1. Real-Time Monitoring:
- **VPN Connection Status**: Online/offline per station
- **Device Health**: CPU, memory, network status
- **LED Panel Status**: Display functionality, error states
- **Price Update Success**: Delivery confirmation

### 2. Logging & Analytics:
- **Price Update History**: Complete audit trail
- **Device Performance**: Response times, error rates
- **Network Statistics**: Bandwidth usage, connection quality
- **Client Activity**: Usage patterns, update frequency

## 🚀 Scalability

### Multi-Location Support:
- **Unique VPN IPs**: Each location gets dedicated IP range
- **Independent Operation**: Locations work independently
- **Centralized Management**: Single dashboard for all locations
- **Bulk Operations**: Update multiple locations simultaneously

### Performance Optimization:
- **Connection Pooling**: Efficient network resource usage
- **Caching**: Reduce database queries
- **Async Processing**: Non-blocking price updates
- **Load Balancing**: Distribute server load

This architecture provides a robust, scalable, and secure solution for managing fuel station LED displays across multiple locations with centralized control and real-time price updates.