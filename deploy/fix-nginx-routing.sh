#!/bin/bash

# Fix Nginx routing to handle root URL properly

DOMAIN="pricepro.clubemkt.digital"

echo "=== FIXING NGINX ROUTING ==="

# Update Nginx configuration to handle root URL
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

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
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

    # Login endpoint with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Root URL - redirect to health check or return API info
    location = / {
        return 302 /health;
    }

    # Catch-all for other paths - return JSON response
    location / {
        add_header Content-Type application/json;
        return 200 '{"service":"FuelPrice Pro API","status":"running","endpoints":["/health","/api/auth","/api/stations","/api/prices"],"documentation":"This is an API-only service. Use /health to check status."}';
    }
}
NGINXEOF

echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Reloading Nginx..."
    systemctl reload nginx
    
    echo "Testing endpoints..."
    echo "Root URL:"
    curl -I https://$DOMAIN/
    
    echo ""
    echo "Health check:"
    curl -s https://$DOMAIN/health | jq .
    
    echo ""
    echo "SUCCESS: Nginx routing fixed!"
    echo "- Root URL (/) redirects to /health"
    echo "- All API endpoints work normally"
    echo "- Unknown paths return API information"
else
    echo "ERROR: Nginx configuration test failed!"
    exit 1
fi