#!/usr/bin/env pwsh

# Upload and run the fixes script
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Uploading fixes script..." -ForegroundColor Green

# Upload the bash script
scp -o StrictHostKeyChecking=no deploy/fix-remaining-issues.sh $Username@${VpsIp}:/tmp/

# Make it executable and run it
$sshCommand = "chmod +x /tmp/fix-remaining-issues.sh && /tmp/fix-remaining-issues.sh"

Write-Host "Running fixes on VPS..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "All fixes completed!" -ForegroundColor Green