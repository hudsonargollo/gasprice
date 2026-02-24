#!/usr/bin/env pwsh

# Fix Nginx configuration - final attempt
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root",
    [string]$Domain = "pricepro.clubemkt.digital"
)

Write-Host "Fixing Nginx configuration..." -ForegroundColor Green

$sshCommand = @"
echo 'Removing broken config...' && 
rm -f /etc/nginx/sites-enabled/$Domain && 
echo 'Creating working Nginx config...' && 
cat > /etc/nginx/sites-available/$Domain << 'NGINXEOF'
server {
    listen 80;
    server_name $Domain;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

echo 'Enabling site...' && 
ln -s /etc/nginx/sites-available/$Domain /etc/nginx/sites-enabled/ && 
echo 'Testing configuration...' && 
nginx -t && 
echo 'Starting Nginx...' && 
systemctl start nginx && 
echo 'Testing access...' && 
curl -I http://localhost/health && 
echo '' && 
echo 'Success! Application is now accessible.'
"@

Write-Host "Applying Nginx fix..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Nginx fix completed!" -ForegroundColor Green