#!/usr/bin/env pwsh

# Setup Nginx and SSL for FuelPrice Pro
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root",
    [string]$Domain = "pricepro.clubemkt.digital"
)

Write-Host "Setting up Nginx and SSL for $Domain..." -ForegroundColor Green

$sshCommand = @"
echo 'Installing Nginx...' && 
apt update && 
apt install -y nginx certbot python3-certbot-nginx && 
echo 'Creating Nginx configuration...' && 
cat > /etc/nginx/sites-available/$Domain << 'EOF'
server {
    listen 80;
    server_name $Domain;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $Domain;
    
    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/$Domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$Domain/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection \"1; mode=block\";
    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;
    
    # Proxy to FuelPrice Pro application
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
    
    # API routes
    location /api {
        proxy_pass http://localhost:3000/api;
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
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo 'Enabling site...' && 
ln -sf /etc/nginx/sites-available/$Domain /etc/nginx/sites-enabled/ && 
rm -f /etc/nginx/sites-enabled/default && 
echo 'Testing Nginx configuration...' && 
nginx -t && 
echo 'Starting Nginx...' && 
systemctl enable nginx && 
systemctl restart nginx && 
echo 'Obtaining SSL certificate...' && 
certbot --nginx -d $Domain --non-interactive --agree-tos --email admin@$Domain && 
echo 'Restarting Nginx with SSL...' && 
systemctl restart nginx && 
echo 'Checking services status...' && 
systemctl status nginx --no-pager -l && 
echo '' && 
echo 'Testing application access...' && 
curl -I http://localhost:3000/health && 
echo '' && 
echo 'Testing HTTPS access...' && 
curl -I https://$Domain/health && 
echo '' && 
echo 'Setup completed!'
"@

Write-Host "Configuring web server and SSL..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Nginx and SSL setup completed!" -ForegroundColor Green
Write-Host "Your application should now be available at: https://$Domain" -ForegroundColor Cyan
Write-Host "API endpoint: https://$Domain/api" -ForegroundColor Cyan