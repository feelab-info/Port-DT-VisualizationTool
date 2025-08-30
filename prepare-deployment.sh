#!/bin/bash

# Prepare deployment package for Port Digital Twin production server
# This script creates a deployment-ready package

set -e

echo "📦 Preparing Port Digital Twin for deployment..."

# Define deployment directory
DEPLOY_DIR="port-digital-twin-deploy"
DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="port-digital-twin-${DATE}.tar.gz"

# Clean up previous deployment directory
if [ -d "$DEPLOY_DIR" ]; then
    echo "🧹 Cleaning up previous deployment directory..."
    rm -rf "$DEPLOY_DIR"
fi

# Create deployment directory
mkdir -p "$DEPLOY_DIR"

echo "📁 Copying necessary files..."

# Copy core application files
cp -r backend "$DEPLOY_DIR/"
cp -r frontend "$DEPLOY_DIR/"
cp -r dc_power_flow "$DEPLOY_DIR/"
cp -r vessel_modelling "$DEPLOY_DIR/"

# Copy nginx configuration
cp -r nginx "$DEPLOY_DIR/"

# Copy deployment scripts and configuration
cp docker-compose.yml "$DEPLOY_DIR/"
cp production-config.env.template "$DEPLOY_DIR/"
cp setup-ssl.sh "$DEPLOY_DIR/"
cp renew-ssl.sh "$DEPLOY_DIR/"
cp start-production.sh "$DEPLOY_DIR/"
cp PRODUCTION_DEPLOYMENT.md "$DEPLOY_DIR/"

# Copy environment file if it exists (but rename it)
if [ -f ".env.production" ]; then
    cp .env.production "$DEPLOY_DIR/.env.production.example"
    echo "⚠️  Copied .env.production as .env.production.example"
    echo "   You'll need to create a new .env.production on the server"
fi

# Copy other important files
cp README.md "$DEPLOY_DIR/" 2>/dev/null || true
cp .gitignore "$DEPLOY_DIR/" 2>/dev/null || true

# Make scripts executable
chmod +x "$DEPLOY_DIR"/*.sh

# Create a deployment info file
cat > "$DEPLOY_DIR/deployment-info.txt" << EOF
Port Digital Twin Deployment Package
===================================
Generated: $(date)
From: $(whoami)@$(hostname)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "Not a git repository")

Files included:
- Complete application source code
- Nginx reverse proxy configuration
- Docker Compose configuration
- SSL setup and management scripts
- Production deployment scripts
- Comprehensive deployment documentation

Next steps:
1. Transfer this package to your production server
2. Follow the instructions in PRODUCTION_DEPLOYMENT.md
3. Configure DNS for portdt.prsma.com
4. Run the deployment scripts

For support, refer to PRODUCTION_DEPLOYMENT.md
EOF

# Create tar package
echo "📦 Creating deployment package..."
tar -czf "$PACKAGE_NAME" "$DEPLOY_DIR"

# Calculate package size
PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)

echo ""
echo "✅ Deployment package created successfully!"
echo ""
echo "📦 Package: $PACKAGE_NAME"
echo "📏 Size: $PACKAGE_SIZE"
echo "📁 Directory: $DEPLOY_DIR/"
echo ""
echo "🚀 Next steps:"
echo "1. Transfer to your server:"
echo "   scp $PACKAGE_NAME user@your-server:/opt/"
echo ""
echo "2. On your server, extract and deploy:"
echo "   cd /opt"
echo "   tar -xzf $PACKAGE_NAME"
echo "   cd $DEPLOY_DIR"
echo "   ./start-production.sh"
echo ""
echo "3. Follow the complete guide in PRODUCTION_DEPLOYMENT.md"
echo ""
echo "📋 Files ready for deployment:"
ls -la "$DEPLOY_DIR" | head -10
echo "   ... and more (see $DEPLOY_DIR/ for complete list)"
echo ""
echo "🎯 Your production domain will be: https://portdt.prsma.com"
