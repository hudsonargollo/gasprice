#!/usr/bin/env pwsh

# Fix Dockerfile and redeploy
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Fixing Dockerfile and redeploying..." -ForegroundColor Green

# Upload fixed Dockerfile
Write-Host "Uploading fixed Dockerfile..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no Dockerfile $Username@${VpsIp}:/opt/applications/fuelprice-pro/

# Rebuild and restart
$sshCommand = @"
cd /opt/applications/fuelprice-pro && 
echo 'Stopping current containers...' && 
docker-compose -f docker-compose.shared.yml down && 
echo 'Rebuilding with fixed Dockerfile...' && 
docker-compose -f docker-compose.shared.yml build --no-cache && 
echo 'Starting services...' && 
docker-compose -f docker-compose.shared.yml up -d && 
echo 'Waiting for services...' && 
sleep 30 && 
echo 'Checking status...' && 
docker ps && 
echo '' && 
echo 'Checking logs...' && 
docker-compose -f docker-compose.shared.yml logs --tail=20
"@

Write-Host "Rebuilding application..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Redeploy completed!" -ForegroundColor Green
Write-Host "Check your application at: https://pricepro.clubemkt.digital" -ForegroundColor Cyan