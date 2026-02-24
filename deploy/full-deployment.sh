#!/bin/bash

# Full Deployment Script for FuelPrice Pro Multi-App VPS
# This script will deploy everything to your VPS

set -e

VPS_IP="62.171.137.90"
VPS_USER="root"
VPS_PASS="Engefil1773#"

echo "🚀 Starting full deployment to VPS: $VPS_IP"

# Function to run commands on VPS
run_on_vps() {
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "$1"
}

# Function to copy files to VPS
copy_to_vps() {
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r "$1" "$VPS_USER@$VPS_IP:$2"
}

echo "📦 Installing sshpass for automated deployment..."
if ! command -v sshpass &> /dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y sshpass
    else
        echo "Please install sshpass manually and run this script again"
        exit 1
    fi
fi

echo "🔗 Testing VPS connection..."
run_on_vps "echo 'VPS connection successful!'"

echo "📁 Creating deployment directory on VPS..."
run_on_vps "mkdir -p /opt/fuelprice-deployment"

echo "📤 Uploading deployment files..."
copy_to_vps "." "/opt/fuelprice-deployment/"

echo "🔧 Making scripts executable..."
run_on_vps "chmod +x /opt/fuelprice-deployment/deploy/*.sh"

echo "🏗️ Running multi-app setup..."
run_on_vps "cd /opt/fuelprice-deployment && ./deploy/multi-app-setup.sh"

echo "⚙️ Configuring shared infrastructure..."
run_on_vps "cd /opt/shared-infrastructure && cp .env.template .env"

# Generate secure passwords
POSTGRES_ROOT_PASSWORD=$(openssl rand -base64 32)
FUELPRICE_DB_PASSWORD=$(openssl rand -base64 32)
N8N_DB_PASSWORD=$(openssl rand -base64 32)
GOWA_DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

echo "🔐 Setting up environment variables..."
run_on_vps "cd /opt/shared-infrastructure && cat > .env << 'EOF'
# Shared Infrastructure Environment Variables
DOMAIN=62.171.137.90.nip.io
ACME_EMAIL=admin@62.171.137.90.nip.io

# PostgreSQL Configuration
POSTGRES_ROOT_PASSWORD=$POSTGRES_ROOT_PASSWORD
FUELPRICE_DB_PASSWORD=$FUELPRICE_DB_PASSWORD
N8N_DB_PASSWORD=$N8N_DB_PASSWORD
GOWA_DB_PASSWORD=$GOWA_DB_PASSWORD

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD

# Traefik Dashboard
TRAEFIK_DASHBOARD_USER=admin
TRAEFIK_DASHBOARD_PASSWORD=admin123
EOF"

echo "🗄️ Updating database initialization script..."
run_on_vps "cd /opt/shared-infrastructure && sed -i 's/FUELPRICE_DB_PASSWORD_PLACEHOLDER/$FUELPRICE_DB_PASSWORD/g' postgres/init/01-create-databases.sql"
run_on_vps "cd /opt/shared-infrastructure && sed -i 's/N8N_DB_PASSWORD_PLACEHOLDER/$N8N_DB_PASSWORD/g' postgres/init/01-create-databases.sql"
run_on_vps "cd /opt/shared-infrastructure && sed -i 's/GOWA_DB_PASSWORD_PLACEHOLDER/$GOWA_DB_PASSWORD/g' postgres/init/01-create-databases.sql"

echo "🚀 Starting shared infrastructure..."
run_on_vps "cd /opt/shared-infrastructure && docker-compose up -d"

echo "⏳ Waiting for services to start..."
sleep 30

echo "📱 Deploying FuelPrice Pro..."
run_on_vps "cd /opt/fuelprice-deployment && ./deploy/deploy-fuelprice.sh"

echo "⚙️ Configuring FuelPrice Pro environment..."
JWT_SECRET=$(openssl rand -base64 64)
run_on_vps "cd /opt/applications/fuelprice-pro && cat > .env << 'EOF'
# FuelPrice Pro Environment Variables
NODE_ENV=production
PORT=3000

# Database Configuration (using shared PostgreSQL)
DB_HOST=shared-postgres
DB_PORT=5432
DB_NAME=fuelprice_pro
DB_USER=fuelprice_admin
FUELPRICE_DB_PASSWORD=$FUELPRICE_DB_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Domain Configuration
DOMAIN=62.171.137.90.nip.io

# CORS Configuration
CORS_ORIGIN=https://fuelprice.62.171.137.90.nip.io

# Logging
LOG_LEVEL=info
LOG_FILE=logs/production.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
SESSION_TIMEOUT_MINUTES=60
MAX_SESSIONS_PER_USER=5
EOF"

echo "🔄 Restarting FuelPrice Pro with new configuration..."
run_on_vps "cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml down"
run_on_vps "cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml up -d"

echo "⏳ Waiting for application to start..."
sleep 20

echo "🔍 Checking deployment status..."
run_on_vps "docker ps"

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your applications are available at:"
echo "   FuelPrice Pro: https://fuelprice.62.171.137.90.nip.io"
echo "   Traefik Dashboard: https://traefik.62.171.137.90.nip.io (admin/admin123)"
echo ""
echo "🔐 Database credentials:"
echo "   PostgreSQL Root: postgres / $POSTGRES_ROOT_PASSWORD"
echo "   FuelPrice DB: fuelprice_admin / $FUELPRICE_DB_PASSWORD"
echo ""
echo "📱 Mobile App Configuration:"
echo "   Update API_BASE_URL to: https://fuelprice.62.171.137.90.nip.io/api"
echo ""
echo "🔧 To check logs:"
echo "   ssh root@$VPS_IP"
echo "   cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml logs -f"

# Save credentials to local file
cat > deployment-credentials.txt << EOF
VPS Deployment Credentials
=========================

VPS Details:
- IP: $VPS_IP
- User: $VPS_USER
- Password: $VPS_PASS

Application URLs:
- FuelPrice Pro: https://fuelprice.62.171.137.90.nip.io
- Traefik Dashboard: https://traefik.62.171.137.90.nip.io

Database Credentials:
- PostgreSQL Root: postgres / $POSTGRES_ROOT_PASSWORD
- FuelPrice DB: fuelprice_admin / $FUELPRICE_DB_PASSWORD
- N8N DB: n8n_user / $N8N_DB_PASSWORD
- Gowa DB: gowa_user / $GOWA_DB_PASSWORD
- Redis: $REDIS_PASSWORD

Application Secrets:
- JWT Secret: $JWT_SECRET

Login Credentials:
- Admin User: admin / admin123

Mobile App Configuration:
- API URL: https://fuelprice.62.171.137.90.nip.io/api
EOF

echo "💾 Credentials saved to: deployment-credentials.txt"