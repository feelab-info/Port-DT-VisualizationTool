#!/bin/bash

# SSL Certificate Renewal Script for portdt.prsma.com
# Run this script regularly (e.g., via cron) to renew SSL certificates

set -e

echo "🔄 Renewing SSL certificates for portdt.prsma.com..."

# Load production environment if available
if [[ -f .env.production ]]; then
    source .env.production
fi

DOMAIN="${DOMAIN:-portdt.prsma.com}"

echo "🌐 Renewing certificate for domain: $DOMAIN"

# Renew certificates
docker-compose run --rm certbot renew

# Check if renewal was successful
if [[ $? -eq 0 ]]; then
    echo "✅ Certificate renewal completed successfully!"
    
    # Reload nginx to use new certificates
    echo "🔄 Reloading nginx configuration..."
    docker-compose exec nginx nginx -s reload
    
    echo "🎉 SSL certificate renewal completed!"
else
    echo "❌ Certificate renewal failed!"
    echo "Please check the logs and try again."
    exit 1
fi
