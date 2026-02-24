# Interactive Deployment Script
$VPS_IP = "62.171.137.90"
$VPS_USER = "root"

Write-Host "🚀 FuelPrice Pro Deployment to VPS: $VPS_IP" -ForegroundColor Green
Write-Host "🌐 Domain: pricepro.clubemkt.digital" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will deploy your FuelPrice Pro system step by step." -ForegroundColor Yellow
Write-Host "You'll need to enter the VPS password when prompted." -ForegroundColor Yellow
Write-Host ""

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
$deploymentPath = "fuelprice-deployment.tar.gz"
if (Test-Path $deploymentPath) { Remove-Item $deploymentPath -Force }

tar -czf $deploymentPath --exclude=node_modules --exclude=.git --exclude=dist --exclude=temp --exclude=mobile/node_modules --exclude=mobile/.expo --exclude=mobile/android --exclude=logs .

Write-Host "✅ Deployment package created: $deploymentPath" -ForegroundColor Green
Write-Host ""

Write-Host "📤 Now we'll upload the files to your VPS..." -ForegroundColor Yellow
Write-Host "Please enter the VPS password when prompted: Engefil1773#" -ForegroundColor Cyan
Write-Host ""

# Upload files
scp $deploymentPath $VPS_USER@${VPS_IP}:/tmp/

Write-Host ""
Write-Host "✅ Files uploaded successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "🔧 Now connecting to VPS to run setup..." -ForegroundColor Yellow
Write-Host "The following commands will be executed on your VPS:" -ForegroundColor Cyan
Write-Host "1. Extract deployment files" -ForegroundColor White
Write-Host "2. Install Docker and dependencies" -ForegroundColor White  
Write-Host "3. Configure shared infrastructure" -ForegroundColor White
Write-Host "4. Deploy FuelPrice Pro" -ForegroundColor White
Write-Host ""
Write-Host "Please enter the VPS password when prompted..." -ForegroundColor Cyan

# Connect and run deployment
ssh -t $VPS_USER@$VPS_IP @"
echo '🚀 Starting VPS setup...'
cd /tmp
tar -xzf fuelprice-deployment.tar.gz
mv fuelprice-deployment /opt/
cd /opt/fuelprice-deployment
chmod +x deploy/*.sh

echo '🏗️ Running multi-app setup...'
./deploy/multi-app-setup.sh

echo '⚙️ Configuring shared infrastructure...'
cd /opt/shared-infrastructure
cp .env.template .env

# Configure environment
cat > .env << 'EOF'
DOMAIN=pricepro.clubemkt.digital
ACME_EMAIL=admin@pricepro.clubemkt.digital
POSTGRES_ROOT_PASSWORD=SecurePostgresPass123!
FUELPRICE_DB_PASSWORD=SecureFuelPricePass123!
N8N_DB_PASSWORD=SecureN8NPass123!
GOWA_DB_PASSWORD=SecureGowaPass123!
REDIS_PASSWORD=SecureRedisPass123!
TRAEFIK_DASHBOARD_USER=admin
TRAEFIK_DASHBOARD_PASSWORD=admin123
EOF

# Update database init script
sed -i 's/FUELPRICE_DB_PASSWORD_PLACEHOLDER/SecureFuelPricePass123!/g' postgres/init/01-create-databases.sql
sed -i 's/N8N_DB_PASSWORD_PLACEHOLDER/SecureN8NPass123!/g' postgres/init/01-create-databases.sql
sed -i 's/GOWA_DB_PASSWORD_PLACEHOLDER/SecureGowaPass123!/g' postgres/init/01-create-databases.sql

echo '🚀 Starting shared infrastructure...'
docker-compose up -d

echo '⏳ Waiting for services to start...'
sleep 30

echo '📱 Deploying FuelPrice Pro...'
cd /opt/fuelprice-deployment
./deploy/deploy-fuelprice.sh

echo '⚙️ Configuring FuelPrice Pro...'
cd /opt/applications/fuelprice-pro
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DB_HOST=shared-postgres
DB_PORT=5432
DB_NAME=fuelprice_pro
DB_USER=fuelprice_admin
FUELPRICE_DB_PASSWORD=SecureFuelPricePass123!
JWT_SECRET=YourSuperSecureJWTSecretKeyHere123456789!
DOMAIN=pricepro.clubemkt.digital
CORS_ORIGIN=https://pricepro.clubemkt.digital
LOG_LEVEL=info
LOG_FILE=logs/production.log
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT_MINUTES=60
MAX_SESSIONS_PER_USER=5
EOF

echo '🔄 Starting FuelPrice Pro...'
docker-compose -f docker-compose.shared.yml up -d

echo '⏳ Waiting for application to start...'
sleep 20

echo '🔍 Checking deployment status...'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ''
echo '✅ Deployment complete!'
echo ''
echo '🌐 Your application is available at:'
echo '   https://pricepro.clubemkt.digital'
echo ''
echo '🔐 Login credentials:'
echo '   Username: admin'
echo '   Password: admin123'
echo ''
echo '📱 Mobile App API: https://pricepro.clubemkt.digital/api'
echo ''
echo 'Press Enter to exit...'
read
"@

# Clean up
if (Test-Path $deploymentPath) { Remove-Item $deploymentPath -Force }

Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your FuelPrice Pro system should now be available at:" -ForegroundColor Cyan
Write-Host "   https://pricepro.clubemkt.digital" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login with:" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "📱 Mobile app is configured for:" -ForegroundColor Cyan
Write-Host "   https://pricepro.clubemkt.digital/api" -ForegroundColor White

# Save credentials
$credentials = @"
FuelPrice Pro VPS Deployment - COMPLETED
========================================

🌐 Application URL: https://pricepro.clubemkt.digital

🔐 Login Credentials:
Username: admin
Password: admin123

📱 Mobile App API: https://pricepro.clubemkt.digital/api

🖥️ VPS Access:
IP: $VPS_IP
User: $VPS_USER
SSH: ssh root@$VPS_IP

🗄️ Database Credentials:
PostgreSQL Root: postgres / SecurePostgresPass123!
FuelPrice DB: fuelprice_admin / SecureFuelPricePass123!

🔧 Management Commands:
Check status: docker ps
View logs: cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml logs -f
Restart: cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml restart

🏗️ Infrastructure Ready For:
- n8n workflow automation
- Gowa or other applications
- Shared PostgreSQL database
- Automatic SSL certificates
- Redis caching
"@

$credentials | Out-File -FilePath "deployment-success.txt" -Encoding UTF8
Write-Host ""
Write-Host "💾 Deployment details saved to: deployment-success.txt" -ForegroundColor Green