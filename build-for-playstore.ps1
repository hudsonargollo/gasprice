#!/usr/bin/env pwsh

# Build Engefil Connect for Google Play Store
# This script builds the production APK/AAB for publishing

Write-Host "=== Building Engefil Connect for Google Play Store ===" -ForegroundColor Green

# Navigate to mobile directory
Set-Location mobile

Write-Host "Checking EAS CLI installation..." -ForegroundColor Yellow
try {
    $easVersion = eas --version
    Write-Host "EAS CLI version: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing EAS CLI..." -ForegroundColor Yellow
    npm install -g @expo/eas-cli
}

Write-Host "Current app configuration:" -ForegroundColor Cyan
Write-Host "- App Name: Engefil Connect" -ForegroundColor White
Write-Host "- Package: com.engefil.connect" -ForegroundColor White
Write-Host "- Version: 1.0.0" -ForegroundColor White
Write-Host "- Description: Controle remoto de placas de preço" -ForegroundColor White

Write-Host "`nBuilding production AAB for Google Play Store..." -ForegroundColor Yellow
Write-Host "This will create an Android App Bundle (.aab) file" -ForegroundColor White

# Build production version
eas build --platform android --profile production

Write-Host "`n=== Build Commands Completed ===" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait for build to complete (check Expo dashboard)" -ForegroundColor White
Write-Host "2. Download the .aab file from Expo" -ForegroundColor White
Write-Host "3. Upload to Google Play Console" -ForegroundColor White
Write-Host "4. Complete store listing with screenshots and description" -ForegroundColor White

Write-Host "`nAlternative - Build APK for testing:" -ForegroundColor Yellow
Write-Host "eas build --platform android --profile preview" -ForegroundColor White