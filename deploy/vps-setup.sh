#!/bin/bash

# FuelPrice Pro VPS Setup Script
# Run this script on your VPS to set up the production environment

set -e

echo "🚀 Setting up FuelPrice Pro on VPS..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for local development/debugging)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx (reverse proxy)
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/fuelprice-pro
sudo chown $USER:$USER /opt/fuelprice-pro

# Create logs directory
mkdir -p /opt/fuelprice-pro/logs

# Install PM2 for process management (alternative to Docker)
echo "⚡ Installing PM2..."
sudo npm install -g pm2

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

# Create systemd service for Docker Compose
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/fuelprice-pro.service > /dev/null <<EOF
[Unit]
Description=FuelPrice Pro Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/fuelprice-pro
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl enable fuelprice-pro.service

echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your application code to /opt/fuelprice-pro"
echo "2. Create .env file with your production settings"
echo "3. Run: sudo systemctl start fuelprice-pro"
echo "4. Configure Nginx reverse proxy"
echo "5. Set up SSL certificate with Let's Encrypt"