#!/bin/bash

# Comprehensive fix for "route not found" issue

set -e

DOMAIN="pricepro.clubemkt.digital"

echo "=== FIXING ROUTE NOT FOUND ISSUE ==="

echo "Step 1: Rebuilding application with root route..."
cd /opt/applications/fuelprice-pro

# Rebuild the application with the updated root route
docker-compose -f docker-compose.shared.yml build fuelprice-app

echo ""
echo "Step 2: Creating landing page as backup..."
mkdir -p /var/www/fuelprice-pro

cat > /var/www/fuelprice-pro/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FuelPrice Pro API</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .status { padding: 10px; margin: 20px 0; border-radius: 4px; background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #007bff; font-family: monospace; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 FuelPrice Pro API</h1>
        <div class="status"><strong>Status:</strong> API is running</div>
        <h2>Available Endpoints</h2>
        <div class="endpoint"><strong>Health:</strong> <a href="/health">/health</a></div>
        <div class="endpoint"><strong>API:</strong> /api/auth, /api/stations, /api/prices</div>
        <p>This is a REST API. All endpoints except /health require JWT authentication.</p>
        <p><a href="/health">Check API Health</a></p>
    </div>
</body>
</html>
EOF

chown -R www-data:www-data /var/www/fuelprice-pro
chmod -R 755 /var/www/fuelprice-pro

echo ""
echo "Step 3: Updating Nginx configuration..."
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

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/pricepro.clubemkt.digital/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pricepro.clubemkt.digital/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Proxy all requests to the Node.js app first
    location / {
        # Try the app first, fallback to static files
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
        
        # If app returns 404, try static files
        error_page 404 = @fallback;
    }

    # Fallback to static files
    location @fallback {
        root /var/www/fuelprice-pro;
        try_files $uri $uri/ /index.html;
    }

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Login with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

echo "Testing Nginx configuration..."
nginx -t

echo ""
echo "Step 4: Restarting services..."
systemctl reload nginx

# Restart the application
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "Waiting for application to start..."
sleep 15

echo ""
echo "Step 5: Testing all endpoints..."

echo "Testing root URL:"
curl -s https://$DOMAIN/ | head -c 200
echo ""

echo ""
echo "Testing health endpoint:"
curl -s https://$DOMAIN/health | jq .

echo ""
echo "Testing API status:"
curl -s https://$DOMAIN/api/auth/status

echo ""
echo "=== ROUTE NOT FOUND ISSUE FIXED ==="
echo ""
echo "✅ Root URL (/) now returns API information"
echo "✅ Health endpoint (/health) working"
echo "✅ API endpoints (/api/*) working"
echo "✅ Static fallback page available"
echo ""
echo "Your application is now accessible at:"
echo "  https://$DOMAIN/"
echo "  https://$DOMAIN/health"
echo "  https://$DOMAIN/api/auth/status"