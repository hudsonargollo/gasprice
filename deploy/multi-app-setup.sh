#!/bin/bash

# Multi-Application VPS Setup Script
# Sets up shared infrastructure for multiple applications (FuelPrice Pro, n8n, Gowa, etc.)

set -e

echo "🚀 Setting up Multi-Application VPS Infrastructure..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
sudo apt install -y curl wget git unzip htop ufw fail2ban

# Install Docker and Docker Compose
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for various applications)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx (reverse proxy for all applications)
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for SSL certificates
echo "🔒 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create shared infrastructure directory
echo "📁 Creating shared infrastructure..."
sudo mkdir -p /opt/shared-infrastructure
sudo mkdir -p /opt/applications
sudo chown $USER:$USER /opt/shared-infrastructure
sudo chown $USER:$USER /opt/applications

# Create applications directories
mkdir -p /opt/applications/fuelprice-pro
mkdir -p /opt/applications/n8n
mkdir -p /opt/applications/gowa
mkdir -p /opt/shared-infrastructure/postgres
mkdir -p /opt/shared-infrastructure/nginx
mkdir -p /opt/shared-infrastructure/logs

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Install fail2ban for security
echo "🛡️ Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create shared PostgreSQL service
echo "🗄️ Setting up shared PostgreSQL..."
cat > /opt/shared-infrastructure/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: shared-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_ROOT_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - shared-network

  redis:
    image: redis:7-alpine
    container_name: shared-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - shared-network

  traefik:
    image: traefik:v2.10
    container_name: traefik
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    restart: unless-stopped
    networks:
      - shared-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(\`traefik.${DOMAIN}\`)"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"

volumes:
  postgres_data:
  redis_data:
  traefik_letsencrypt:

networks:
  shared-network:
    driver: bridge
    external: false
EOF

# Create database initialization script
mkdir -p /opt/shared-infrastructure/postgres/init
cat > /opt/shared-infrastructure/postgres/init/01-create-databases.sql << 'EOF'
-- Create databases for different applications
CREATE DATABASE fuelprice_pro;
CREATE DATABASE n8n;
CREATE DATABASE gowa;

-- Create users for different applications
CREATE USER fuelprice_admin WITH PASSWORD 'FUELPRICE_DB_PASSWORD_PLACEHOLDER';
CREATE USER n8n_user WITH PASSWORD 'N8N_DB_PASSWORD_PLACEHOLDER';
CREATE USER gowa_user WITH PASSWORD 'GOWA_DB_PASSWORD_PLACEHOLDER';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE fuelprice_pro TO fuelprice_admin;
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;
GRANT ALL PRIVILEGES ON DATABASE gowa TO gowa_user;

-- Enable extensions
\c fuelprice_pro;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c n8n;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c gowa;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# Create environment template
cat > /opt/shared-infrastructure/.env.template << 'EOF'
# Shared Infrastructure Environment Variables
# Copy this to .env and update the values

# Domain Configuration
DOMAIN=your-domain.com
ACME_EMAIL=your-email@domain.com

# PostgreSQL Configuration
POSTGRES_ROOT_PASSWORD=your_super_secure_postgres_root_password
FUELPRICE_DB_PASSWORD=your_secure_fuelprice_db_password
N8N_DB_PASSWORD=your_secure_n8n_db_password
GOWA_DB_PASSWORD=your_secure_gowa_db_password

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password

# Traefik Dashboard
TRAEFIK_DASHBOARD_USER=admin
TRAEFIK_DASHBOARD_PASSWORD=your_secure_dashboard_password
EOF

# Create systemd service for shared infrastructure
echo "🔧 Creating systemd service for shared infrastructure..."
sudo tee /etc/systemd/system/shared-infrastructure.service > /dev/null << 'EOF'
[Unit]
Description=Shared Infrastructure (PostgreSQL, Redis, Traefik)
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/shared-infrastructure
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable shared-infrastructure.service

echo "✅ Multi-Application VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy /opt/shared-infrastructure/.env.template to .env and configure it"
echo "2. Start shared infrastructure: sudo systemctl start shared-infrastructure"
echo "3. Deploy individual applications to /opt/applications/"
echo "4. Configure domain DNS to point to this server"
echo ""
echo "Shared services will be available at:"
echo "- PostgreSQL: localhost:5432"
echo "- Redis: localhost:6379"
echo "- Traefik Dashboard: https://traefik.your-domain.com"