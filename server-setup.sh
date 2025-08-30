#!/bin/bash

# Server Setup Script for Port Digital Twin
# Run this script on your production server to install dependencies

set -e

echo "🚀 Setting up production server for Port Digital Twin..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐙 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# Install additional tools
echo "🛠️  Installing additional tools..."
sudo apt install -y git curl nano htop ufw openssl

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
echo "✅ Firewall configured (SSH, HTTP, HTTPS allowed)"

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/port-digital-twin
sudo chown $USER:$USER /opt/port-digital-twin
echo "✅ Application directory created at /opt/port-digital-twin"

# Show Docker group message
echo ""
echo "⚠️  IMPORTANT: You need to log out and log back in for Docker group changes to take effect!"
echo ""
echo "🎯 Next steps:"
echo "1. Log out and log back in (or run: newgrp docker)"
echo "2. Transfer your deployment package to /opt/port-digital-twin/"
echo "3. Extract and run the deployment"
echo ""
echo "📋 Server setup completed successfully!"
echo ""
echo "🔍 Verify installation:"
echo "   docker --version"
echo "   docker-compose --version"
echo "   sudo ufw status"
echo ""
echo "Ready for deployment! 🚀"
