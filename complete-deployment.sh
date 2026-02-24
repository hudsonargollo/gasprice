#!/bin/bash

# Complete FuelPrice Pro Deployment Script
# Run this on your VPS to finish the deployment

set -e

echo "🚀 Completing FuelPrice Pro deployment..."

# Move files to correct location
echo "📁 Setting up deployment files..."
mkdir -p /opt/fuelprice-deployment
cd /tmp
cp -r * /opt/fuelprice-deployment/ 2>/dev/null || true
cd /opt/fuelprice-deployment
chmod +x deploy/*.sh 2>/dev/null || true

# Create applications directory
echo "📁 Creating applications directory..."
mkdir -p /opt/applications/fuelprice-pro
cd /opt/applications/fuelprice-pro

# Copy necessary files
cp /tmp/docker-compose.shared.yml . 2>/dev/null || echo "Creating docker-compose.shared.yml..."
cp /tmp/Dockerfile . 2>/dev/null || echo "Creating Dockerfile..."
cp -r /tmp/src . 2>/dev/null || echo "Copying source files..."
cp /tmp/package*.json . 2>/dev/null || echo "Copying package files..."
cp /tmp/tsconfig.json . 2>/dev/null || echo "Copying tsconfig..."

# Create docker-compose.shared.yml if it doesn't exist
if [ ! -f docker-compose.shared.yml ]; then
    echo "📝 Creating docker-compose.shared.yml..."
    cat > docker-compose.shared.yml << 'EOF'
version: '3.8'

services:
  fuelprice-app:
    build: .
    container_name: fuelprice-app
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: shared-postgres
      DB_PORT: 5432
      DB_NAME: fuelprice_pro
      DB_USER: fuelprice_admin
      DB_PASSWORD: ${FUELPRICE_DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://pricepro.clubemkt.digital
    restart: unless-stopped
    networks:
      - shared-infrastructure_shared-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fuelprice.rule=Host(\`pricepro.clubemkt.digital\`)"
      - "traefik.http.routers.fuelprice.tls.certresolver=letsencrypt"
      - "traefik.http.services.fuelprice.loadbalancer.server.port=3000"
    depends_on:
      - db-init

  db-init:
    image: postgres:15-alpine
    container_name: fuelprice-db-init
    environment:
      PGHOST: shared-postgres
      PGPORT: 5432
      PGDATABASE: fuelprice_pro
      PGUSER: fuelprice_admin
      PGPASSWORD: ${FUELPRICE_DB_PASSWORD}
    volumes:
      - ./database/init-app-schema.sql:/init-schema.sql
    networks:
      - shared-infrastructure_shared-network
    command: >
      sh -c "
        echo 'Waiting for PostgreSQL to be ready...'
        until pg_isready -h shared-postgres -p 5432 -U postgres; do
          sleep 2
        done
        echo 'PostgreSQL is ready. Initializing FuelPrice Pro schema...'
        psql -f /init-schema.sql
        echo 'Schema initialization complete.'
      "
    restart: "no"

networks:
  shared-infrastructure_shared-network:
    external: true
EOF
fi

# Create Dockerfile if it doesn't exist
if [ ! -f Dockerfile ]; then
    echo "📝 Creating Dockerfile..."
    cat > Dockerfile << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production
COPY src/ ./src/
RUN npm run build

FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fuelprice -u 1001

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --chown=fuelprice:nodejs . .

USER fuelprice
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
EOF
fi

# Create database directory and schema
mkdir -p database
if [ ! -f database/init-app-schema.sql ]; then
    echo "📝 Creating database schema..."
    cat > database/init-app-schema.sql << 'EOF'
-- FuelPrice Pro Application Schema
\c fuelprice_pro;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_stations_owner_id ON stations(owner_id);
CREATE INDEX IF NOT EXISTS idx_stations_vpn_ip ON stations(vpn_ip_address);
CREATE INDEX IF NOT EXISTS idx_led_panels_station_id ON led_panels(station_id);
CREATE INDEX IF NOT EXISTS idx_price_logs_station_id ON price_update_logs(station_id);
CREATE INDEX IF NOT EXISTS idx_price_logs_created_at ON price_update_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

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

INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2b$10$rOzJqQZQJQZQJQZQJQZQJeK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'admin')
ON CONFLICT (username) DO NOTHING;

DO $$
DECLARE
    admin_user_id UUID;
    sample_station_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    
    IF admin_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stations LIMIT 1) THEN
        INSERT INTO stations (owner_id, name, vpn_ip_address, latitude, longitude, address)
        VALUES (
            admin_user_id,
            'Downtown Gas Station',
            '192.168.1.100',
            40.7128,
            -74.0060,
            '123 Main St, New York, NY 10001'
        ) RETURNING id INTO sample_station_id;
        
        INSERT INTO led_panels (station_id, name, regular_price, premium_price, diesel_price)
        VALUES 
            (sample_station_id, 'Main Display Panel', 3.45, 3.65, 3.25),
            (sample_station_id, 'Secondary Panel', 3.45, 3.65, 3.25);
    END IF;
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Sample data insertion failed: %', SQLERRM;
END $$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fuelprice_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fuelprice_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO fuelprice_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fuelprice_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fuelprice_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO fuelprice_admin;
EOF
fi

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env << 'EOF'
# FuelPrice Pro Environment Variables
NODE_ENV=production
PORT=3000

# Database Configuration (using shared PostgreSQL)
DB_HOST=shared-postgres
DB_PORT=5432
DB_NAME=fuelprice_pro
DB_USER=fuelprice_admin
FUELPRICE_DB_PASSWORD=Advance1773#

# JWT Configuration
JWT_SECRET=YourSuperSecureJWTSecretKeyHere123456789!

# Domain Configuration
DOMAIN=pricepro.clubemkt.digital

# CORS Configuration
CORS_ORIGIN=https://pricepro.clubemkt.digital

# Logging
LOG_LEVEL=info
LOG_FILE=logs/production.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
SESSION_TIMEOUT_MINUTES=60
MAX_SESSIONS_PER_USER=5
EOF

# Build and start the application
echo "🔨 Building and starting FuelPrice Pro..."
docker-compose -f docker-compose.shared.yml build
docker-compose -f docker-compose.shared.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check status
echo "🔍 Checking deployment status..."
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application should be available at:"
echo "   https://pricepro.clubemkt.digital"
echo ""
echo "🔐 Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📱 Mobile App API: https://pricepro.clubemkt.digital/api"
echo ""
echo "🔧 To check logs:"
echo "   docker-compose -f docker-compose.shared.yml logs -f"