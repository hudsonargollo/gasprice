#!/usr/bin/env pwsh

# Fix logger and redeploy
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Fixing logger and redeploying..." -ForegroundColor Green

# Upload fixed logger
Write-Host "Uploading fixed logger..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no src/utils/logger.ts $Username@${VpsIp}:/opt/applications/fuelprice-pro/src/utils/

# Rebuild and restart
$sshCommand = @"
cd /opt/applications/fuelprice-pro && 
echo 'Stopping containers...' && 
docker-compose -f docker-compose.shared.yml down && 
echo 'Rebuilding with fixed logger...' && 
docker-compose -f docker-compose.shared.yml build --no-cache && 
echo 'Starting services...' && 
docker-compose -f docker-compose.shared.yml up -d && 
echo 'Waiting for startup...' && 
sleep 30 && 
echo 'Checking status...' && 
docker ps && 
echo '' && 
echo 'Application logs:' && 
docker-compose -f docker-compose.shared.yml logs fuelprice-app --tail=20 && 
echo '' && 
echo 'Testing API health...' && 
curl -s http://localhost:3000/health || echo 'Health check failed'
"@

Write-Host "Rebuilding application..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Logger fix and redeploy completed!" -ForegroundColor Green
Write-Host "Check your application at: https://pricepro.clubemkt.digital" -ForegroundColor Cyan