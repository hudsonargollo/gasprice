# FuelPrice Pro Backend

Backend service for the FuelPrice Pro LED management system. This service provides secure API endpoints for managing gas station LED pricing displays through a VPN infrastructure.

## Features

- **Secure Authentication**: JWT-based authentication with role-based access control
- **Station Management**: CRUD operations for gas stations and LED panels
- **Price Updates**: Real-time price updates via Huidu protocol over TCP
- **VPN Monitoring**: Heartbeat monitoring for station connectivity
- **Data Persistence**: PostgreSQL database with comprehensive logging

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- TypeScript
- A configured VPN network (WireGuard recommended)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Configure your database and other settings in `.env`

5. Set up PostgreSQL database:
   ```sql
   CREATE DATABASE fuelprice_pro;
   CREATE USER fuelprice_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE fuelprice_pro TO fuelprice_user;
   ```

## Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication (Coming in Task 2)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Stations (Coming in Task 3)
- `GET /api/stations` - List user's stations
- `GET /api/stations/:id` - Get station details

### Price Updates (Coming in Task 7)
- `POST /api/prices/update` - Update LED panel prices

## Database Schema

The system uses PostgreSQL with the following main tables:

- **users**: User accounts with role-based access
- **stations**: Gas station locations and VPN configuration
- **led_panels**: Individual LED display panels per station
- **price_update_logs**: Audit trail for all price changes

## Architecture

The backend follows a layered architecture:

- **Routes**: Express.js route handlers
- **Services**: Business logic and external integrations
- **Models**: Data access layer
- **Middleware**: Authentication, validation, error handling
- **Utils**: Shared utilities and helpers

## Security

- All API endpoints require authentication (except health check)
- Role-based access control (Admin vs Owner)
- Input validation and sanitization
- Secure password hashing with bcrypt
- JWT tokens for session management
- Comprehensive audit logging

## Monitoring

- Structured logging with Winston
- Health check endpoint for load balancers
- Database connection monitoring
- VPN tunnel heartbeat monitoring

## License

MIT License - see LICENSE file for details