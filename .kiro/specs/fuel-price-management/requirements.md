# Requirements Document

## Introduction

FuelPrice Pro is a white-labeled mobile application and backend system designed for gas station owners to remotely manage LED pricing panels across multiple geographical locations. The system leverages a private VPN network (MikroTik) and direct TCP communication with Huidu HD-W60 controllers, bypassing all third-party cloud dependencies for enhanced security and reliability.

## Glossary

- **System**: The complete FuelPrice Pro application including mobile app, backend, and hardware integration
- **Station**: A gas station location containing one or more LED pricing panels
- **LED_Panel**: Huidu HD-W60 controller managing LED price displays
- **VPN_Gateway**: MikroTik hAP device providing secure network connectivity
- **Admin**: User with full system access and management capabilities
- **Owner**: User with access limited to their assigned stations
- **Price_Update**: Command to change fuel price display on LED panels
- **Heartbeat**: Regular network ping to verify device connectivity status

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a system administrator, I want secure user authentication and role-based access control, so that only authorized users can manage pricing systems.

#### Acceptance Criteria

1. WHEN a user attempts to log in, THE System SHALL authenticate credentials against the user database
2. WHEN authentication fails, THE System SHALL prevent access and log the attempt
3. WHERE a user has Admin role, THE System SHALL grant access to all stations and user management functions
4. WHERE a user has Owner role, THE System SHALL restrict access to only their assigned stations
5. WHEN a user session expires, THE System SHALL require re-authentication

### Requirement 2: Station and Device Management

**User Story:** As a gas station owner, I want to view and manage my LED pricing panels, so that I can monitor their status and ensure they're operational.

#### Acceptance Criteria

1. WHEN a user accesses the dashboard, THE System SHALL display a list of all authorized stations
2. WHEN displaying station information, THE System SHALL show real-time online/offline status based on VPN tunnel heartbeat
3. WHEN a station has multiple LED panels, THE System SHALL group them under the station (e.g., Main Totem, Pump 1)
4. WHEN VPN connectivity is lost, THE System SHALL update station status to offline within 30 seconds
5. WHEN VPN connectivity is restored, THE System SHALL update station status to online within 10 seconds

### Requirement 3: Price Update Engine

**User Story:** As a gas station owner, I want to update fuel prices on my LED displays, so that customers see current pricing information.

#### Acceptance Criteria

1. WHEN a user selects a station for price updates, THE System SHALL display numeric inputs for different fuel types (Diesel, Gasoline, etc.)
2. WHEN a user enters price values, THE System SHALL validate that prices are positive numbers with appropriate decimal precision
3. WHEN a user clicks "Sync All", THE System SHALL push price updates to all LED panels at the station simultaneously
4. WHEN sending price updates, THE System SHALL use TCP communication over port 5005 with Huidu hex protocol
5. WHEN an LED panel receives a price update, THE System SHALL confirm successful receipt and display confirmation feedback
6. IF a price update fails, THEN THE System SHALL retry the update up to 3 times and report failure if unsuccessful

### Requirement 4: Network Communication Protocol

**User Story:** As a system architect, I want reliable TCP communication with LED controllers, so that price updates are transmitted securely and accurately.

#### Acceptance Criteria

1. WHEN communicating with LED panels, THE System SHALL use TCP protocol on port 5005 without TLS encryption
2. WHEN sending commands, THE System SHALL verify active WireGuard interface before transmission
3. WHEN constructing Huidu protocol frames, THE System SHALL use frame header 0x02 (STX) and footer 0x03 (ETX)
4. WHEN encoding price data, THE System SHALL use UTF-8/ASCII encoding for numeric values
5. WHEN transmitting frames, THE System SHALL include CRC16-CCITT checksum (Poly: 0x1021) for data integrity
6. WHEN network timeout occurs, THE System SHALL abort transmission after 5000ms

### Requirement 5: Data Persistence and Management

**User Story:** As a system administrator, I want reliable data storage for stations and users, so that the system maintains accurate records and configurations.

#### Acceptance Criteria

1. WHEN storing station information, THE System SHALL persist station ID, owner ID, name, VPN IP address, online status, and last sync timestamp
2. WHEN a station status changes, THE System SHALL update the database record immediately
3. WHEN price updates are sent, THE System SHALL log the update timestamp and success/failure status
4. WHEN querying station data, THE System SHALL return current status and configuration information
5. WHEN the system starts, THE System SHALL initialize database connections and verify schema integrity

### Requirement 6: Mobile Application Interface

**User Story:** As a gas station owner, I want an intuitive mobile interface, so that I can easily manage pricing from any location.

#### Acceptance Criteria

1. WHEN the app launches, THE System SHALL display a card view for each authorized station showing current prices and connection status
2. WHEN a user selects a station, THE System SHALL navigate to the price editor screen
3. WHEN editing prices, THE System SHALL provide a large numeric keypad optimized for outdoor/high-glare environments
4. WHEN displaying the interface, THE System SHALL use primary color #0055ff and support dark mode
5. WHEN network connectivity is poor, THE System SHALL provide appropriate loading indicators and error messages

### Requirement 7: Security and Data Validation

**User Story:** As a system administrator, I want robust security measures, so that the LED panel network remains isolated and protected from unauthorized access.

#### Acceptance Criteria

1. WHEN processing price inputs, THE System SHALL sanitize all data to prevent buffer overflow or invalid characters
2. WHEN accessing LED panels, THE System SHALL route all communication through the Node.js backend as the only gateway
3. WHEN validating price data, THE System SHALL ensure values are within acceptable ranges (0.01 to 999.99)
4. WHEN storing sensitive data, THE System SHALL use appropriate encryption for passwords and authentication tokens
5. IF invalid or malicious data is detected, THEN THE System SHALL reject the input and log the security event

### Requirement 8: System Monitoring and Heartbeat

**User Story:** As a system administrator, I want real-time monitoring of device connectivity, so that I can quickly identify and resolve network issues.

#### Acceptance Criteria

1. WHEN a VPN tunnel is active, THE System SHALL send heartbeat pings every 30 seconds to verify connectivity
2. WHEN a heartbeat response is received, THE System SHALL update the station's last_sync timestamp
3. WHEN heartbeat fails 3 consecutive times, THE System SHALL mark the station as offline
4. WHEN an offline station responds to heartbeat, THE System SHALL immediately mark it as online
5. WHEN displaying station status, THE System SHALL show the time since last successful communication