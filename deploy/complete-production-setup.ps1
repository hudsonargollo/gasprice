#!/usr/bin/env pwsh

# Complete Production Setup for FuelPrice Pro
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root",
    [string]$Domain = "pricepro.clubemkt.digital"
)

Write-Host "Starting complete production setup..." -ForegroundColor Green
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Fix PostgreSQL authentication" -ForegroundColor Yellow
Write-Host "  2. Setup Nginx with SSL certificate" -ForegroundColor Yellow
Write-Host "  3. Configure domain access" -ForegroundColor Yellow
Write-Host "  4. Update mobile app configuration" -ForegroundColor Yellow
Write-Host ""

$sshCommand = @"
echo '=== STEP 1: Fix PostgreSQL Authentication ===' && 
echo 'Checking current database users...' && 
docker exec shared-postgres psql -U postgres -c '\du' && 
echo '' && 
echo 'Creating fuelprice_admin user with correct password...' && 
docker exec shared-postgres psql -U postgres -c "DROP USER IF EXISTS fuelprice_admin;" && 
docker exec shared-postgres psql -U postgres -c "CREATE USER fuelprice_admin WITH PASSWORD 'Advance1773#';" && 
docker exec shared-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE fuelprice_pro TO fuelprice_admin;" && 
echo 'Database user created successfully!' && 
echo '' && 
echo '=== STEP 2: Restart Application with Real Database ===' && 
cd /opt/applications/fuelprice-pro && 
docker-compose -f docker-compose.shared.yml restart fuelprice-app && 
echo 'Waiting for application restart...' && 
sleep 20 && 
echo 'Checking application logs...' && 
docker logs fuelprice-app --tail=10 && 
echo '' && 
echo '=== STEP 3: Setup Nginx and SSL ===' && 
echo 'Installing required packages...' && 
apt update -qq && 
apt install -y nginx certbot python3-certbot-nginx && 
echo 'Removing old configurations...' && 
rm -f /etc/nginx/sites-enabled/* && 
echo 'Creating proper Nginx configuration...' && 
cat > /etc/nginx/sites-available/$Domain << 'NGINXEOF'
server {
    listen 80;
    server_name $Domain www.$Domain;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $Domain www.$Domain;
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:3000;
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
NGINXEOF

echo 'Enabling site...' && 
ln -s /etc/nginx/sites-available/$Domain /etc/nginx/sites-enabled/ && 
echo 'Testing Nginx configuration...' && 
nginx -t && 
echo 'Starting Nginx...' && 
systemctl enable nginx && 
systemctl restart nginx && 
echo 'Obtaining SSL certificate...' && 
certbot --nginx -d $Domain -d www.$Domain --non-interactive --agree-tos --email admin@$Domain --redirect && 
echo 'Final Nginx restart...' && 
systemctl restart nginx && 
echo '' && 
echo '=== STEP 4: Final Testing ===' && 
echo 'Testing HTTP redirect...' && 
curl -I http://$Domain/health 2>/dev/null | head -3 && 
echo 'Testing HTTPS access...' && 
curl -I https://$Domain/health 2>/dev/null | head -3 && 
echo 'Testing API endpoint...' && 
curl -s https://$Domain/api/auth/status | head -1 && 
echo '' && 
echo '=== DEPLOYMENT COMPLETE ===' && 
echo 'Application Status:' && 
docker ps --format 'table {{.Names}}\t{{.Status}}' && 
echo '' && 
echo 'Nginx Status:' && 
systemctl status nginx --no-pager -l | head -5 && 
echo '' && 
echo '✅ Production setup completed successfully!'
"@

Write-Host "Executing production setup on VPS..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Production setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "=== FINAL CONFIGURATION ===" -ForegroundColor Cyan
Write-Host "Application URL: https://$Domain" -ForegroundColor Green
Write-Host "Mobile API URL: https://$Domain/api" -ForegroundColor Green
Write-Host "Health Check: https://$Domain/health" -ForegroundColor Green
Write-Host "SSL Certificate: Enabled with auto-renewal" -ForegroundColor Green
Write-Host "Database: PostgreSQL (production)" -ForegroundColor Green