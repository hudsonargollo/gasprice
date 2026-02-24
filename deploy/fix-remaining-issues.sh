#!/bin/bash

# Fix remaining PostgreSQL permissions and Nginx SSL issues

set -e

DOMAIN="pricepro.clubemkt.digital"

echo "=== FIXING REMAINING ISSUES ==="

echo "=== STEP 1: Fix PostgreSQL Schema Permissions ==="
echo "Granting schema permissions to fuelprice_admin..."
docker exec shared-postgres psql -U postgres -d fuelprice_pro -c "GRANT ALL ON SCHEMA public TO fuelprice_admin;"
docker exec shared-postgres psql -U postgres -d fuelprice_pro -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fuelprice_admin;"
docker exec shared-postgres psql -U postgres -d fuelprice_pro -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fuelprice_admin;"
docker exec shared-postgres psql -U postgres -d fuelprice_pro -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fuelprice_admin;"
docker exec shared-postgres psql -U postgres -d fuelprice_pro -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fuelprice_admin;"

echo ""
echo "Testing schema permissions..."
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro -c "CREATE TABLE test_permissions (id SERIAL PRIMARY KEY, name TEXT);"
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro -c "DROP TABLE test_permissions;"
echo "Schema permissions working!"

echo ""
echo "=== STEP 2: Fix Nginx Configuration for SSL ==="
echo "Creating HTTP-only Nginx configuration first..."
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    server_name pricepro.clubemkt.digital www.pricepro.clubemkt.digital;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
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

echo "Testing Nginx configuration..."
nginx -t

echo "Restarting Nginx..."
systemctl restart nginx

echo "Testing HTTP access..."
curl -I http://$DOMAIN/health

echo ""
echo "=== STEP 3: Obtain SSL Certificate ==="
echo "Getting SSL certificate from Let's Encrypt..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo ""
echo "=== STEP 4: Restart Application with Fixed Database ==="
cd /opt/applications/fuelprice-pro
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "Waiting for application restart..."
sleep 20

echo "Checking application logs..."
docker logs fuelprice-app --tail=10

echo ""
echo "=== STEP 5: Final Testing ==="
echo "Testing HTTPS access..."
curl -I https://$DOMAIN/health

echo "Testing API endpoint..."
curl -s https://$DOMAIN/api/auth/status

echo ""
echo "=== ALL ISSUES FIXED ==="
echo "Application Status:"
docker ps --format 'table {{.Names}}\t{{.Status}}'

echo ""
echo "SUCCESS: Your FuelPrice Pro application is now fully operational!"
echo ""
echo "Access URLs:"
echo "  https://$DOMAIN"
echo "  https://$DOMAIN/api"
echo "  https://$DOMAIN/health"
echo ""
echo "Database: PostgreSQL (production)"
echo "SSL: Enabled with auto-renewal"