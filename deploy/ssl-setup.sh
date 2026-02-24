#!/bin/bash

# SSL Certificate Setup with Let's Encrypt
# Run this after setting up your domain DNS

set -e

DOMAIN="your-domain.com"

echo "🔒 Setting up SSL certificate for $DOMAIN..."

# Install Certbot
echo "📦 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Stop Nginx temporarily
sudo systemctl stop nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate..."
sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN

# Start Nginx
sudo systemctl start nginx

# Test certificate renewal
echo "🔄 Testing certificate renewal..."
sudo certbot renew --dry-run

# Set up automatic renewal
echo "⏰ Setting up automatic renewal..."
sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

echo "✅ SSL setup complete!"
echo "Your site should now be accessible at https://$DOMAIN"