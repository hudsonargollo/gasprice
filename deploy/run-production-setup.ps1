#!/usr/bin/env pwsh

# Upload and run the production setup script
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Uploading production setup script..." -ForegroundColor Green

# Upload the bash script
scp -o StrictHostKeyChecking=no deploy/complete-production-setup.sh $Username@${VpsIp}:/tmp/

# Make it executable and run it
$sshCommand = "chmod +x /tmp/complete-production-setup.sh && /tmp/complete-production-setup.sh"

Write-Host "Running production setup on VPS..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Production setup completed!" -ForegroundColor Green