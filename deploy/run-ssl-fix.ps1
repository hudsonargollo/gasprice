#!/usr/bin/env pwsh

# Upload and run the SSL fix script
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Uploading SSL fix script..." -ForegroundColor Green

# Upload the bash script
scp -o StrictHostKeyChecking=no deploy/fix-ssl-final.sh $Username@${VpsIp}:/tmp/

# Make it executable and run it
$sshCommand = "chmod +x /tmp/fix-ssl-final.sh && /tmp/fix-ssl-final.sh"

Write-Host "Running SSL fix on VPS..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "SSL fix completed!" -ForegroundColor Green