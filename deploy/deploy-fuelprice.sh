#!/bin/bash

# FuelPrice Pro Deployment Script for Multi-App VPS
# This script deploys FuelPrice Pro to a VPS with shared infrastructure

set -e

# Configuration
APP_NAME="fuelprice-pro"
APP_DIR="/opt/applications/$APP_NAME"
SHARED_DIR="/opt/shared-infrastructure"

echo "🚀 Deploying FuelPrice Pro..."

# Check if shared infrastructure is running
if ! docker ps | grep -q "shared-postgres"; then
    echo "❌ Shared infrastructure is not running!"
    echo "Please start it first: sudo systemctl start shared-infrastructure"
    exit 1
fi

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
echo "📦 Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cat > .env << EOF
# FuelPrice Pro Environment Variables
NODE_ENV=production
PORT=3000

# Database Configuration (using shared PostgreSQL)
DB_HOST=shared-postgres
DB_PORT=5432
DB_NAME=fuelprice_pro
DB_USER=fuelprice_admin
FUELPRICE_DB_PASSWORD=your_secure_fuelprice_db_password

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters

# Domain Configuration
DOMAIN=your-domain.com

# CORS Configuration
CORS_ORIGIN=https://fuelprice.your-domain.com

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

    echo "⚠️  Please edit $APP_DIR/.env with your actual configuration values"
    echo "   Especially: FUELPRICE_DB_PASSWORD, JWT_SECRET, and DOMAIN"
fi

# Build the application
echo "🔨 Building application..."
docker-compose -f docker-compose.shared.yml build

# Deploy the application
echo "🚀 Starting FuelPrice Pro..."
docker-compose -f docker-compose.shared.yml up -d

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/fuelprice-pro.service > /dev/null << EOF
[Unit]
Description=FuelPrice Pro Application
Requires=shared-infrastructure.service
After=shared-infrastructure.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.shared.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.shared.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable fuelprice-pro.service

echo "✅ FuelPrice Pro deployment complete!"
echo ""
echo "Application will be available at: https://fuelprice.$DOMAIN"
echo ""
echo "To check status:"
echo "  sudo systemctl status fuelprice-pro"
echo "  docker-compose -f docker-compose.shared.yml logs -f"
echo ""
echo "To access the database:"
echo "  docker exec -it shared-postgres psql -U fuelprice_admin -d fuelprice_pro"