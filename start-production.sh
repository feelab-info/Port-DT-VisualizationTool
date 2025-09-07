#!/bin/bash

# Production Deployment Script for Port Digital Twin
# Use this script to deploy the application to production with SSL

set -e

echo "🚢 Starting Port Digital Twin in Production Mode..."
echo ""

# Check if running as root (recommended for production)
if [[ $EUID -eq 0 ]]; then
    echo "✅ Running as root - good for production deployment"
else
    echo "⚠️  Not running as root - make sure Docker permissions are configured"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check for production environment file
if [[ ! -f .env.production ]]; then
    echo "❌ .env.production file not found!"
    echo ""
    echo "Please create .env.production from the template:"
    echo "cp production-config.env.template .env.production"
    echo "Then edit .env.production with your production values."
    exit 1
fi

# Load production environment
echo "📁 Loading production environment..."
cp .env.production .env

# Verify critical configuration
source .env.production

if [[ "$JWT_SECRET" == "your-super-secure-jwt-secret-for-production-minimum-32-characters" ]]; then
    echo "❌ Please update JWT_SECRET in .env.production!"
    exit 1
fi

if [[ "$SSL_EMAIL" == "your-email@example.com" ]]; then
    echo "❌ Please update SSL_EMAIL in .env.production!"
    exit 1
fi

echo "✅ Production environment configured"

# Build all services
echo "🔨 Building all services..."
docker-compose build

# Check if SSL certificates exist
if [[ -f "nginx/ssl/live/$DOMAIN/fullchain.pem" ]]; then
    echo "🔒 SSL certificates found - starting with HTTPS"
    
    # Start all services including nginx with SSL
    docker-compose up -d
    
    echo ""
    echo "🎉 Port Digital Twin started successfully in production mode!"
    echo ""
    echo "🌐 Your application is available at:"
    echo "   https://$DOMAIN"
    echo "   http://localhost:8080 (local development access)"
    echo ""
    
else
    echo "🔒 No SSL certificates found - running setup..."
    echo ""
    echo "Please run the SSL setup first:"
    echo "./setup-ssl.sh"
    echo ""
    echo "Or start without SSL for now:"
    echo "docker-compose up -d"
    echo "Application will be available at: http://localhost:8080"
fi

# Show service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "📋 Useful commands:"
echo "  View logs:       docker-compose logs -f [service]"
echo "  Stop services:   docker-compose down"
echo "  Restart:         docker-compose restart [service]"
echo "  Update SSL:      ./renew-ssl.sh"
