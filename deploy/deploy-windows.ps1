# PowerShell Deployment Script for Windows
# This script will deploy FuelPrice Pro to your VPS from Windows

$VPS_IP = "62.171.137.90"
$VPS_USER = "root"
$VPS_PASS = "Engefil1773#"

Write-Host "🚀 Starting deployment to VPS: $VPS_IP" -ForegroundColor Green

# Function to run SSH commands using plink (PuTTY)
function Invoke-SSHCommand {
    param($Command)
    $result = echo y | plink -ssh -l $VPS_USER -pw $VPS_PASS $VPS_IP $Command
    return $result
}

# Function to copy files using pscp (PuTTY)
function Copy-ToVPS {
    param($LocalPath, $RemotePath)
    echo y | pscp -r -l $VPS_USER -pw $VPS_PASS $LocalPath "${VPS_USER}@${VPS_IP}:$RemotePath"
}

# Check if PuTTY tools are available
if (-not (Get-Command plink -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PuTTY tools not found. Please install PuTTY and add it to PATH" -ForegroundColor Red
    Write-Host "Download from: https://www.putty.org/" -ForegroundColor Yellow
    Write-Host "Or install via chocolatey: choco install putty" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔗 Testing VPS connection..." -ForegroundColor Yellow
try {
    Invoke-SSHCommand "echo 'VPS connection successful!'"
    Write-Host "✅ Connection successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Connection failed. Please check VPS details." -ForegroundColor Red
    exit 1
}

Write-Host "📁 Creating deployment directory on VPS..." -ForegroundColor Yellow
Invoke-SSHCommand "mkdir -p /opt/fuelprice-deployment"

Write-Host "📤 Uploading deployment files..." -ForegroundColor Yellow
Copy-ToVPS "." "/opt/fuelprice-deployment/"

Write-Host "🔧 Making scripts executable..." -ForegroundColor Yellow
Invoke-SSHCommand "chmod +x /opt/fuelprice-deployment/deploy/*.sh"

Write-Host "🏗️ Running multi-app setup..." -ForegroundColor Yellow
Invoke-SSHCommand "cd /opt/fuelprice-deployment && ./deploy/multi-app-setup.sh"

Write-Host "⚙️ Configuring shared infrastructure..." -ForegroundColor Yellow
Invoke-SSHCommand "cd /opt/shared-infrastructure && cp .env.template .env"

# Generate secure passwords
$POSTGRES_ROOT_PASSWORD = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$FUELPRICE_DB_PASSWORD = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$N8N_DB_PASSWORD = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$GOWA_DB_PASSWORD = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$REDIS_PASSWORD = [System.Web.Security.Membership]::GeneratePassword(32, 8)
$JWT_SECRET = [System.Web.Security.Membership]::GeneratePassword(64, 16)

Write-Host "🔐 Setting up environment variables..." -ForegroundColor Yellow
$envContent = @"
# Shared Infrastructure Environment Variables
DOMAIN=pricepro.clubemkt.digital
ACME_EMAIL=admin@pricepro.clubemkt.digital

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
"@

Invoke-SSHCommand "cd /opt/shared-infrastructure && cat > .env << 'EOF'`n$envContent`nEOF"

Write-Host "🗄️ Updating database initialization script..." -ForegroundColor Yellow
Invoke-SSHCommand "cd /opt/shared-infrastructure && sed -i 's/FUELPRICE_DB_PASSWORD_PLACEHOLDER/$FUELPRICE_DB_PASSWORD/g' postgres/init/01-create-databases.sql"
Invoke-SSHCommand "cd /opt/shared-infrastructure && sed -i 's/N8N_DB_PASSWORD_PLACEHOLDER/$N8N_DB_PASSWORD/g' postgres/init/01-create-databases.sql"
Invoke-SSHCommand "cd /opt/shared-infrastructure && sed -i 's/GOWA_DB_PASSWORD_PLACEHOLDER/$GOWA_DB_PASSWORD/g' postgres/init/01-create-databases.sql"

Write-Host "🚀 Starting shared infrastructure..." -ForegroundColor Yellow
Invoke-SSHCommand "cd /opt/shared-infrastructure && docker-compose up -d"

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "📱 Deploying FuelPrice Pro..." -ForegroundColor Yellow
Invoke-SSHCommand "cd /opt/fuelprice-deployment && ./deploy/deploy-fuelprice.sh"

Write-Host "⚙️ Configuring FuelPrice Pro environment..." -ForegroundColor Yellow
$fuelpriceEnv = @"
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
"@

Invoke-SSHCommand "cd /opt/applications/fuelprice-pro && cat > .env << 'EOF'`n$fuelpriceEnv`nEOF"

Write-Host "🔄 Restarting FuelPrice Pro with new configuration..." -ForegroundColor Yellow
Invoke-SSHCommand "cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml down"
Invoke-SSHCommand "cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml up -d"

Write-Host "⏳ Waiting for application to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host "🔍 Checking deployment status..." -ForegroundColor Yellow
Invoke-SSHCommand "docker ps"

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your applications are available at:" -ForegroundColor Cyan
Write-Host "   FuelPrice Pro: https://pricepro.clubemkt.digital" -ForegroundColor White
Write-Host "   Traefik Dashboard: https://traefik.pricepro.clubemkt.digital (admin/admin123)" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Database credentials:" -ForegroundColor Cyan
Write-Host "   PostgreSQL Root: postgres / $POSTGRES_ROOT_PASSWORD" -ForegroundColor White
Write-Host "   FuelPrice DB: fuelprice_admin / $FUELPRICE_DB_PASSWORD" -ForegroundColor White
Write-Host ""
Write-Host "📱 Mobile App Configuration:" -ForegroundColor Cyan
Write-Host "   API URL is already configured: https://pricepro.clubemkt.digital/api" -ForegroundColor White

# Save credentials to local file
$credentialsContent = @"
VPS Deployment Credentials
=========================

VPS Details:
- IP: $VPS_IP
- User: $VPS_USER
- Password: $VPS_PASS

Application URLs:
- FuelPrice Pro: https://pricepro.clubemkt.digital
- Traefik Dashboard: https://traefik.pricepro.clubemkt.digital

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
- API URL: https://pricepro.clubemkt.digital/api

SSH Commands:
- Connect: ssh root@$VPS_IP
- Check logs: cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml logs -f
- Check status: docker ps
- Restart: sudo systemctl restart fuelprice-pro
"@

$credentialsContent | Out-File -FilePath "deployment-credentials.txt" -Encoding UTF8

Write-Host "💾 Credentials saved to: deployment-credentials.txt" -ForegroundColor Green