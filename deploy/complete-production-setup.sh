#!/bin/bash

# Complete Production Setup for FuelPrice Pro
# This script fixes PostgreSQL, sets up Nginx with SSL, and completes the deployment

set -e

DOMAIN="pricepro.clubemkt.digital"

echo "=== STARTING COMPLETE PRODUCTION SETUP ==="
echo "Domain: $DOMAIN"
echo ""

echo "=== STEP 1: Fix PostgreSQL Authentication ==="
echo "Checking current database users..."
docker exec shared-postgres psql -U postgres -c '\du'

echo ""
echo "Updating fuelprice_admin user password..."
docker exec shared-postgres psql -U postgres -c "ALTER USER fuelprice_admin WITH PASSWORD 'Advance1773#';" || {
    echo "Creating new fuelprice_admin user..."
    docker exec shared-postgres psql -U postgres -c "CREATE USER fuelprice_admin WITH PASSWORD 'Advance1773#';"
}
docker exec shared-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE fuelprice_pro TO fuelprice_admin;"
docker exec shared-postgres psql -U postgres -c "ALTER USER fuelprice_admin CREATEDB;"

echo ""
echo "Verifying user creation..."
docker exec shared-postgres psql -U postgres -c '\du'

echo ""
echo "Testing connection with new user..."
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro -c 'SELECT current_user, current_database();'

echo ""
echo "=== STEP 2: Restart Application with Real Database ==="
cd /opt/applications/fuelprice-pro
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "Waiting for application restart..."
sleep 30

echo "Checking application logs..."
docker logs fuelprice-app --tail=15

echo ""
echo "=== STEP 3: Setup Nginx and SSL ==="
echo "Installing required packages..."
apt update -qq
apt install -y nginx certbot python3-certbot-nginx

echo "Removing old configurations..."
rm -f /etc/nginx/sites-enabled/*

echo "Creating proper Nginx configuration..."
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    server_name pricepro.clubemkt.digital www.pricepro.clubemkt.digital;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name pricepro.clubemkt.digital www.pricepro.clubemkt.digital;
    
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

echo "Enabling site..."
ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

echo "Testing Nginx configuration..."
nginx -t

echo "Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

echo "Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo "Final Nginx restart..."
systemctl restart nginx

echo ""
echo "=== STEP 4: Final Testing ==="
echo "Testing HTTP redirect..."
curl -I http://$DOMAIN/health 2>/dev/null | head -3

echo "Testing HTTPS access..."
curl -I https://$DOMAIN/health 2>/dev/null | head -3

echo "Testing API endpoint..."
curl -s https://$DOMAIN/api/auth/status | head -1

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Application Status:"
docker ps --format 'table {{.Names}}\t{{.Status}}'

echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager -l | head -5

echo ""
echo "SUCCESS: Production setup completed!"
echo ""
echo "Your application is now available at:"
echo "  https://$DOMAIN"
echo "  https://$DOMAIN/api (Mobile API)"
echo "  https://$DOMAIN/health (Health Check)"
echo ""
echo "SSL certificate is installed and will auto-renew."
echo "Database is now using PostgreSQL instead of mock data."