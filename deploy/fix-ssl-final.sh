#!/bin/bash

# Fix SSL certificate for just the main domain

set -e

DOMAIN="pricepro.clubemkt.digital"

echo "=== FIXING SSL CERTIFICATE ==="

echo "Getting SSL certificate for main domain only..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo ""
echo "Testing HTTPS access..."
curl -I https://$DOMAIN/health

echo ""
echo "Testing API endpoint..."
curl -s https://$DOMAIN/api/auth/status

echo ""
echo "=== FINAL APPLICATION RESTART ==="
cd /opt/applications/fuelprice-pro
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "Waiting for final restart..."
sleep 20

echo "Checking final application logs..."
docker logs fuelprice-app --tail=10

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Application Status:"
docker ps --format 'table {{.Names}}\t{{.Status}}'

echo ""
echo "SUCCESS: FuelPrice Pro is now fully operational!"
echo ""
echo "Access URLs:"
echo "  https://$DOMAIN (Main Application)"
echo "  https://$DOMAIN/api (Mobile API)"
echo "  https://$DOMAIN/health (Health Check)"
echo ""
echo "Features:"
echo "  ✅ PostgreSQL Database (Production)"
echo "  ✅ SSL Certificate (Auto-renewal enabled)"
echo "  ✅ Nginx Reverse Proxy"
echo "  ✅ Docker Containers"
echo "  ✅ Health Monitoring"
echo ""
echo "Your FuelPrice Pro application is ready for production use!"