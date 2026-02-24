#!/usr/bin/env pwsh

# Fix Nginx configuration and check application
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root",
    [string]$Domain = "pricepro.clubemkt.digital"
)

Write-Host "Fixing Nginx configuration and checking application..." -ForegroundColor Green

$sshCommand = @"
echo 'Checking application status...' && 
docker ps && 
echo '' && 
echo 'Checking if app is accessible on port 3000...' && 
netstat -tlnp | grep :3000 && 
echo '' && 
echo 'Testing direct container access...' && 
docker exec fuelprice-app curl -s http://localhost:3000/health || echo 'Container health check failed' && 
echo '' && 
echo 'Fixing Nginx configuration...' && 
cat > /etc/nginx/sites-available/$Domain << 'EOF'
server {
    listen 80;
    server_name $Domain;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

echo 'Testing Nginx configuration...' && 
nginx -t && 
echo 'Restarting Nginx...' && 
systemctl restart nginx && 
echo 'Checking Nginx status...' && 
systemctl status nginx --no-pager -l && 
echo '' && 
echo 'Testing HTTP access...' && 
curl -I http://localhost/health && 
echo '' && 
echo 'Checking if port 80 is accessible...' && 
netstat -tlnp | grep :80
"@

Write-Host "Running diagnostics and fixes..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Diagnostics completed!" -ForegroundColor Green