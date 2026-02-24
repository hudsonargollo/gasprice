#!/usr/bin/env pwsh

# Final fix for port mapping and Nginx
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root",
    [string]$Domain = "pricepro.clubemkt.digital"
)

Write-Host "Applying final fixes..." -ForegroundColor Green

# Upload fixed docker-compose
Write-Host "Uploading fixed docker-compose..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no docker-compose.shared.yml $Username@${VpsIp}:/opt/applications/fuelprice-pro/

$sshCommand = @"
cd /opt/applications/fuelprice-pro && 
echo 'Stopping containers...' && 
docker-compose -f docker-compose.shared.yml down && 
echo 'Starting with port mapping...' && 
docker-compose -f docker-compose.shared.yml up -d && 
echo 'Waiting for startup...' && 
sleep 30 && 
echo 'Checking port mapping...' && 
ss -tlnp | grep :3000 && 
echo '' && 
echo 'Testing application access...' && 
curl -s http://localhost:3000/health && 
echo '' && 
echo 'Creating simple Nginx config...' && 
cat > /etc/nginx/sites-available/$Domain << 'EOF'
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
EOF

echo 'Testing and starting Nginx...' && 
nginx -t && 
systemctl restart nginx && 
echo 'Testing final access...' && 
curl -I http://localhost/health && 
echo '' && 
echo 'All services status:' && 
docker ps && 
echo '' && 
systemctl status nginx --no-pager -l
"@

Write-Host "Applying fixes on VPS..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Final fixes completed!" -ForegroundColor Green
Write-Host "Test your application at: http://$Domain" -ForegroundColor Cyan