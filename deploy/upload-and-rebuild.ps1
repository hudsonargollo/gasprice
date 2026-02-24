#!/usr/bin/env pwsh

# Upload source files and rebuild
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Uploading source files and rebuilding..." -ForegroundColor Green

# Create a temporary archive with necessary files
Write-Host "Creating deployment archive..." -ForegroundColor Yellow
$tempDir = "temp-deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir

# Copy necessary files
Copy-Item "src" -Destination "$tempDir/src" -Recurse
Copy-Item "package*.json" -Destination $tempDir
Copy-Item "tsconfig.json" -Destination $tempDir
Copy-Item "Dockerfile" -Destination $tempDir
Copy-Item "docker-compose.shared.yml" -Destination $tempDir
Copy-Item "database" -Destination "$tempDir/database" -Recurse

# Upload files
Write-Host "Uploading files to VPS..." -ForegroundColor Yellow
scp -r -o StrictHostKeyChecking=no $tempDir/* $Username@${VpsIp}:/opt/applications/fuelprice-pro/

# Clean up
Remove-Item -Recurse -Force $tempDir

# Rebuild and restart
$sshCommand = @"
cd /opt/applications/fuelprice-pro && 
echo 'Stopping containers...' && 
docker-compose -f docker-compose.shared.yml down && 
echo 'Removing old images...' && 
docker rmi fuelprice-pro-fuelprice-app 2>/dev/null || true && 
echo 'Building application...' && 
docker-compose -f docker-compose.shared.yml build --no-cache && 
echo 'Starting services...' && 
docker-compose -f docker-compose.shared.yml up -d && 
echo 'Waiting for startup...' && 
sleep 45 && 
echo 'Checking status...' && 
docker ps && 
echo '' && 
echo 'Application logs:' && 
docker-compose -f docker-compose.shared.yml logs fuelprice-app --tail=30
"@

Write-Host "Rebuilding application..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Upload and rebuild completed!" -ForegroundColor Green
Write-Host "Check your application at: https://pricepro.clubemkt.digital" -ForegroundColor Cyan