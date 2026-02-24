# Simple SSH Deployment Script for Windows
param()

$VPS_IP = "62.171.137.90"
$VPS_USER = "root"

Write-Host "Starting deployment to VPS: $VPS_IP" -ForegroundColor Green
Write-Host "Domain: pricepro.clubemkt.digital" -ForegroundColor Cyan

# Test SSH connection
Write-Host "Testing VPS connection..." -ForegroundColor Yellow
try {
    $testResult = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $VPS_USER@$VPS_IP "echo 'Connection successful'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSH connection successful!" -ForegroundColor Green
    } else {
        Write-Host "SSH connection failed. Please check VPS details." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "SSH connection failed: $_" -ForegroundColor Red
    exit 1
}

# Create deployment archive
Write-Host "Creating deployment package..." -ForegroundColor Yellow
$deploymentPath = "$env:TEMP\fuelprice-deployment.tar.gz"
if (Test-Path $deploymentPath) { Remove-Item $deploymentPath -Force }

tar -czf $deploymentPath --exclude=node_modules --exclude=.git --exclude=dist --exclude=temp --exclude=mobile/node_modules --exclude=mobile/.expo --exclude=mobile/android --exclude=logs .

Write-Host "Uploading deployment package..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no $deploymentPath $VPS_USER@${VPS_IP}:/tmp/fuelprice-deployment.tar.gz

Write-Host "Extracting and setting up on VPS..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd /tmp && rm -rf fuelprice-deployment && mkdir -p fuelprice-deployment && tar -xzf fuelprice-deployment.tar.gz -C fuelprice-deployment && rm fuelprice-deployment.tar.gz && mv fuelprice-deployment /opt/ && cd /opt/fuelprice-deployment && chmod +x deploy/*.sh && echo 'Files extracted successfully'"

Write-Host "Running multi-app setup..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd /opt/fuelprice-deployment && ./deploy/multi-app-setup.sh"

Write-Host "Configuring shared infrastructure..." -ForegroundColor Yellow
# Generate secure passwords
$POSTGRES_ROOT_PASSWORD = -join ((1..32) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})
$FUELPRICE_DB_PASSWORD = -join ((1..32) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})
$JWT_SECRET = -join ((1..64) | ForEach {[char]((65..90) + (97..122) + (48..57) | Get-Random)})

# Configure shared infrastructure
$envConfig = "DOMAIN=pricepro.clubemkt.digital`nACME_EMAIL=admin@pricepro.clubemkt.digital`nPOSTGRES_ROOT_PASSWORD=$POSTGRES_ROOT_PASSWORD`nFUELPRICE_DB_PASSWORD=$FUELPRICE_DB_PASSWORD`nN8N_DB_PASSWORD=n8npass123`nGOWA_DB_PASSWORD=gowapass123`nREDIS_PASSWORD=redispass123`nTRAEFIK_DASHBOARD_USER=admin`nTRAEFIK_DASHBOARD_PASSWORD=admin123"

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd /opt/shared-infrastructure && echo '$envConfig' > .env && sed -i 's/FUELPRICE_DB_PASSWORD_PLACEHOLDER/$FUELPRICE_DB_PASSWORD/g' postgres/init/01-create-databases.sql && sed -i 's/N8N_DB_PASSWORD_PLACEHOLDER/n8npass123/g' postgres/init/01-create-databases.sql && sed -i 's/GOWA_DB_PASSWORD_PLACEHOLDER/gowapass123/g' postgres/init/01-create-databases.sql"

Write-Host "Starting shared infrastructure..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd /opt/shared-infrastructure && docker-compose up -d"

Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Deploying FuelPrice Pro..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd /opt/fuelprice-deployment && ./deploy/deploy-fuelprice.sh"

Write-Host "Configuring FuelPrice Pro..." -ForegroundColor Yellow
$fuelpriceConfig = "NODE_ENV=production`nPORT=3000`nDB_HOST=shared-postgres`nDB_PORT=5432`nDB_NAME=fuelprice_pro`nDB_USER=fuelprice_admin`nFUELPRICE_DB_PASSWORD=$FUELPRICE_DB_PASSWORD`nJWT_SECRET=$JWT_SECRET`nDOMAIN=pricepro.clubemkt.digital`nCORS_ORIGIN=https://pricepro.clubemkt.digital`nLOG_LEVEL=info`nLOG_FILE=logs/production.log`nRATE_LIMIT_WINDOW_MS=900000`nRATE_LIMIT_MAX_REQUESTS=100`nSESSION_TIMEOUT_MINUTES=60`nMAX_SESSIONS_PER_USER=5"

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd /opt/applications/fuelprice-pro && echo '$fuelpriceConfig' > .env"

Write-Host "Starting FuelPrice Pro..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml down && docker-compose -f docker-compose.shared.yml up -d"

Write-Host "Waiting for application to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host "Checking deployment status..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your application is available at:" -ForegroundColor Cyan
Write-Host "https://pricepro.clubemkt.digital" -ForegroundColor White
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "Username: admin" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Mobile App API URL: https://pricepro.clubemkt.digital/api" -ForegroundColor Cyan

# Save credentials to file
$credentials = @"
FuelPrice Pro VPS Deployment
============================

Application URL: https://pricepro.clubemkt.digital

Login Credentials:
Username: admin
Password: admin123

Mobile App API: https://pricepro.clubemkt.digital/api

VPS Access:
IP: $VPS_IP
User: $VPS_USER
SSH: ssh root@$VPS_IP

Database Credentials:
PostgreSQL Root: postgres / $POSTGRES_ROOT_PASSWORD
FuelPrice DB: fuelprice_admin / $FUELPRICE_DB_PASSWORD

Application Secrets:
JWT Secret: $JWT_SECRET

Management Commands:
Check status: docker ps
View logs: cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml logs -f
Restart app: cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml restart
"@

$credentials | Out-File -FilePath "deployment-credentials.txt" -Encoding UTF8
Write-Host "Credentials saved to: deployment-credentials.txt" -ForegroundColor Green

# Clean up
if (Test-Path $deploymentPath) { Remove-Item $deploymentPath -Force }

Write-Host ""
Write-Host "Your FuelPrice Pro system is now live!" -ForegroundColor Green
Write-Host "Visit https://pricepro.clubemkt.digital" -ForegroundColor Yellow