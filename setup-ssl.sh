#!/bin/bash

# SSL Certificate Setup Script for portdt.prsma.com
# This script sets up Let's Encrypt SSL certificates for production deployment

set -e

echo "🔒 Setting up SSL certificates for portdt.prsma.com..."

# Check if running on production server
if [[ ! -f .env.production ]]; then
    echo "❌ .env.production file not found!"
    echo "Please copy production-config.env.template to .env.production and configure it."
    exit 1
fi

# Load production environment
source .env.production

# Configuration
DOMAIN="portdt.prsma.com"
EMAIL="${SSL_EMAIL:-your-email@example.com}"

# Verify domain is set correctly
if [[ "$EMAIL" == "your-email@example.com" ]]; then
    echo "❌ Please update SSL_EMAIL in .env.production before running this script!"
    exit 1
fi

echo "📧 Using email: $EMAIL"
echo "🌐 Setting up SSL for domain: $DOMAIN"

# Create necessary directories
mkdir -p nginx/ssl nginx/logs

# Update certbot email in docker-compose.yml
sed -i.bak "s/your-email@example.com/$EMAIL/g" docker-compose.yml
sed -i.bak "s/portdt.prsma.com/$DOMAIN/g" docker-compose.yml

echo "🚀 Starting initial setup without SSL..."

# Start services without nginx first
docker-compose up -d backend frontend dc-power-flow vessel-modelling

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Start nginx with HTTP only for certificate challenge
echo "🌐 Starting nginx for certificate challenge..."
docker-compose up -d nginx

# Wait for nginx to be ready
sleep 10

# Request SSL certificate
echo "🔐 Requesting SSL certificate from Let's Encrypt..."
docker-compose --profile ssl-setup run --rm certbot

# Check if certificate was created
if [[ -f "nginx/ssl/live/$DOMAIN/fullchain.pem" ]]; then
    echo "✅ SSL certificate successfully created!"
    
    # Restart nginx with SSL configuration
    echo "🔄 Restarting nginx with SSL configuration..."
    docker-compose restart nginx
    
    echo ""
    echo "🎉 SSL setup completed successfully!"
    echo ""
    echo "Your application is now available at:"
    echo "🌐 https://$DOMAIN"
    echo "🌐 http://localhost:8080 (development)"
    echo ""
    echo "Next steps:"
    echo "1. Update your DNS to point $DOMAIN to this server's IP"
    echo "2. Test the application at https://$DOMAIN"
    echo "3. Set up automatic certificate renewal with: ./renew-ssl.sh"
    
else
    echo "❌ SSL certificate creation failed!"
    echo "Please check:"
    echo "1. Domain $DOMAIN points to this server's IP address"
    echo "2. Ports 80 and 443 are open and accessible"
    echo "3. No other services are using ports 80/443"
    echo ""
    echo "You can still use the application at: http://localhost:8080"
fi
