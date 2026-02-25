#!/usr/bin/env pwsh

# Complete Production Deployment Script
# Updates VPS backend and builds mobile app for Google Play Store

Write-Host "=== Complete Production Deployment ===" -ForegroundColor Green

Write-Host "`n1. BACKEND DEPLOYMENT" -ForegroundColor Cyan
Write-Host "You need to run these commands on your VPS:" -ForegroundColor Yellow

$vpsCommands = @"
# SSH to VPS
ssh root@vmi3098793.contaboserver.net

# Update backend
cd /opt/applications/fuelprice-pro
git reset --hard HEAD
git pull origin main
npm install
npm run build
pm2 restart fuelprice-backend

# Test endpoints
curl https://pricepro.clubemkt.digital/health
TOKEN=`$(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -H "Authorization: Bearer `$TOKEN" https://pricepro.clubemkt.digital/api/factory/wizard/steps
"@

Write-Host $vpsCommands -ForegroundColor White

Write-Host "`n2. MOBILE APP BUILD" -ForegroundColor Cyan
Write-Host "Building for Google Play Store..." -ForegroundColor Yellow

# Navigate to mobile directory and build
Set-Location mobile

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Checking EAS CLI..." -ForegroundColor Yellow
try {
    eas --version | Out-Null
    Write-Host "EAS CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "Installing EAS CLI..." -ForegroundColor Yellow
    npm install -g @expo/eas-cli
}

Write-Host "`nApp Configuration:" -ForegroundColor Cyan
Write-Host "✅ App Name: Engefil Connect" -ForegroundColor Green
Write-Host "✅ Package: com.engefil.connect" -ForegroundColor Green
Write-Host "✅ Version: 1.0.0" -ForegroundColor Green
Write-Host "✅ Portuguese localization" -ForegroundColor Green
Write-Host "✅ Engefil branding (orange theme)" -ForegroundColor Green
Write-Host "✅ Factory provisioning functionality" -ForegroundColor Green

Write-Host "`nStarting production build..." -ForegroundColor Yellow
Write-Host "This will create an Android App Bundle (.aab) for Google Play Store" -ForegroundColor White

# Start the build
eas build --platform android --profile production

Write-Host "`n=== DEPLOYMENT SUMMARY ===" -ForegroundColor Green
Write-Host "Backend: Ready for VPS update (run commands above)" -ForegroundColor Yellow
Write-Host "Mobile: Building for Google Play Store..." -ForegroundColor Yellow
Write-Host "`nGoogle Play Store Requirements:" -ForegroundColor Cyan
Write-Host "- App will be named 'Engefil Connect'" -ForegroundColor White
Write-Host "- Description: 'Controle remoto de placas de preço'" -ForegroundColor White
Write-Host "- Category: Business/Productivity" -ForegroundColor White
Write-Host "- Target audience: Business users" -ForegroundColor White
Write-Host "- Language: Portuguese (Brazil)" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Update VPS backend (run SSH commands above)" -ForegroundColor White
Write-Host "2. Wait for mobile build to complete" -ForegroundColor White
Write-Host "3. Download .aab file from Expo dashboard" -ForegroundColor White
Write-Host "4. Upload to Google Play Console" -ForegroundColor White
Write-Host "5. Complete store listing and publish" -ForegroundColor White