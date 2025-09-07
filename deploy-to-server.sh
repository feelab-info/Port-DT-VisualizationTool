#!/bin/bash

# One-Click Deployment Script for Port Digital Twin
# This script automates the entire deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER=${1:-"root"}  # Default to ubuntu, pass different user as first argument
SERVER_HOST=${2:-"188.34.197.25"}        # Server IP/domain (required as second argument)

if [[ -z "$SERVER_HOST" ]]; then
    echo -e "${RED}❌ Error: Server host not provided${NC}"
    echo "Usage: $0 [user] <server-host>"
    echo "Example: $0 ubuntu 192.168.1.100"
    echo "Example: $0 root my-server.com"
    exit 1
fi

echo -e "${BLUE}🚀 Port Digital Twin - Automated Deployment${NC}"
echo "Server: $SERVER_USER@$SERVER_HOST"
echo ""

# Step 1: Prepare deployment package
echo -e "${YELLOW}📦 Step 1: Preparing deployment package...${NC}"
./prepare-deployment.sh

# Find the latest deployment package
DEPLOY_PACKAGE=$(ls -t port-digital-twin-*.tar.gz | head -1)

if [[ ! -f "$DEPLOY_PACKAGE" ]]; then
    echo -e "${RED}❌ Error: Deployment package not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment package ready: $DEPLOY_PACKAGE${NC}"
echo ""

# Step 2: Upload to server
echo -e "${YELLOW}📤 Step 2: Uploading to server...${NC}"
echo "Transferring $DEPLOY_PACKAGE to $SERVER_USER@$SERVER_HOST:/opt/"

if scp "$DEPLOY_PACKAGE" "$SERVER_USER@$SERVER_HOST:/opt/"; then
    echo -e "${GREEN}✅ Upload completed${NC}"
else
    echo -e "${RED}❌ Upload failed${NC}"
    exit 1
fi

echo ""

# Step 3: Deploy on server
echo -e "${YELLOW}📦 Step 3: Deploying on server...${NC}"

# Extract and deploy
ssh "$SERVER_USER@$SERVER_HOST" << EOF
    set -e
    echo "📂 Extracting deployment package..."
    cd /opt
    tar -xzf $DEPLOY_PACKAGE

    # Enter deployment directory
    cd port-digital-twin-deploy

    echo "🔧 Making scripts executable..."
    chmod +x *.sh

    echo "📋 Deployment files:"
    ls -la

    echo ""
    echo "🎯 Ready for configuration and deployment!"
    echo ""
    echo "Next steps on server:"
    echo "1. cd /opt/port-digital-twin-deploy"
    echo "2. cp production-config.env.template .env.production"
    echo "3. nano .env.production  # Configure your settings"
    echo "4. ./start-production.sh"
    echo ""
    echo "Or for automated SSL setup:"
    echo "5. ./setup-ssl.sh  # After DNS is configured"
EOF

echo ""
echo -e "${GREEN}🎉 Deployment preparation completed!${NC}"
echo ""
echo -e "${BLUE}📋 Manual steps required on server:${NC}"
echo "1. SSH into your server: ssh $SERVER_USER@$SERVER_HOST"
echo "2. Navigate to deployment: cd /opt/port-digital-twin-deploy"
echo "3. Configure environment: cp production-config.env.template .env.production"
echo "4. Edit configuration: nano .env.production"
echo "5. Deploy: ./start-production.sh"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Update .env.production with your actual domain, database, and secrets"
echo "- Ensure DNS is configured to point to your server"
echo "- SSL certificates will be obtained automatically via Let's Encrypt"
echo ""
echo -e "${GREEN}🚀 Your Port Digital Twin will be available at: https://your-domain.com${NC}"
