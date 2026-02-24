#!/usr/bin/env pwsh

# FuelPrice Pro SSH Deployment Script
# This script connects to your VPS and completes the deployment

param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root",
    [string]$Password = "Engefil1773#"
)

Write-Host "Starting SSH deployment to VPS..." -ForegroundColor Green
Write-Host "VPS: $VpsIp" -ForegroundColor Cyan
Write-Host "User: $Username" -ForegroundColor Cyan

# Check if we have the deployment files ready
if (-not (Test-Path "complete-deployment.sh")) {
    Write-Host "ERROR: complete-deployment.sh not found!" -ForegroundColor Red
    exit 1
}

# Create SSH connection and run deployment
$sshCommand = @"
cd /tmp && 
echo 'Checking current status...' && 
docker ps && 
echo '' && 
echo 'Looking for deployment files...' && 
ls -la /tmp/ | grep -E '\.(sh|yml|json|sql)$' && 
echo '' && 
echo 'Running complete deployment...' && 
chmod +x /tmp/complete-deployment.sh && 
/tmp/complete-deployment.sh
"@

Write-Host "Connecting to VPS and running deployment..." -ForegroundColor Yellow

# Use plink (PuTTY) if available, otherwise use ssh
if (Get-Command plink -ErrorAction SilentlyContinue) {
    Write-Host "Using plink for SSH connection..." -ForegroundColor Cyan
    echo "y" | plink -ssh -l $Username -pw $Password $VpsIp $sshCommand
} elseif (Get-Command ssh -ErrorAction SilentlyContinue) {
    Write-Host "Using OpenSSH for connection..." -ForegroundColor Cyan
    # For OpenSSH, we'll need to handle password differently
    Write-Host "WARNING: You'll be prompted for the password: $Password" -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand
} else {
    Write-Host "ERROR: No SSH client found! Please install OpenSSH or PuTTY." -ForegroundColor Red
    Write-Host "You can manually run these commands on your VPS:" -ForegroundColor Yellow
    Write-Host $sshCommand -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Deployment script completed!" -ForegroundColor Green
Write-Host "Check your application at: https://pricepro.clubemkt.digital" -ForegroundColor Cyan