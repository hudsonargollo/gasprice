#!/usr/bin/env pwsh

# Final deployment with all fixes
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Starting final deployment with all fixes..." -ForegroundColor Green

# Create a complete deployment package
Write-Host "Creating complete deployment package..." -ForegroundColor Yellow
$tempDir = "final-deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir

# Copy all necessary files
Copy-Item "src" -Destination "$tempDir/src" -Recurse
Copy-Item "package*.json" -Destination $tempDir
Copy-Item "tsconfig.json" -Destination $tempDir
Copy-Item "Dockerfile" -Destination $tempDir
Copy-Item "docker-compose.shared.yml" -Destination $tempDir
Copy-Item "database" -Destination "$tempDir/database" -Recurse

# Upload the complete package
Write-Host "Uploading complete package to VPS..." -ForegroundColor Yellow
scp -r -o StrictHostKeyChecking=no $tempDir/* $Username@${VpsIp}:/opt/applications/fuelprice-pro/

# Clean up local temp directory
Remove-Item -Recurse -Force $tempDir

# Deploy on VPS
$sshCommand = @"
cd /opt/applications/fuelprice-pro && 
echo 'Stopping all containers...' && 
docker-compose -f docker-compose.shared.yml down && 
echo 'Removing old images...' && 
docker rmi fuelprice-pro-fuelprice-app 2>/dev/null || true && 
echo 'Building fresh image...' && 
docker-compose -f docker-compose.shared.yml build --no-cache && 
echo 'Starting services...' && 
docker-compose -f docker-compose.shared.yml up -d && 
echo 'Waiting for services to start...' && 
sleep 45 && 
echo 'Final status check...' && 
docker ps && 
echo '' && 
echo 'Application logs:' && 
docker-compose -f docker-compose.shared.yml logs fuelprice-app --tail=30 && 
echo '' && 
echo 'Testing health endpoint...' && 
sleep 10 && 
curl -s http://localhost:3000/health && echo '' || echo 'Health check failed - checking if app is starting...' && 
echo 'Container status:' && 
docker inspect fuelprice-app --format='{{.State.Status}}: {{.State.Error}}'
"@

Write-Host "Deploying on VPS..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Final deployment completed!" -ForegroundColor Green
Write-Host "Your application should be available at: https://pricepro.clubemkt.digital" -ForegroundColor Cyan
Write-Host "API endpoint: https://pricepro.clubemkt.digital/api" -ForegroundColor Cyan