# 🚀 Port Digital Twin - Production Deployment Guide

This guide provides step-by-step instructions for deploying the Port Digital Twin application to a production server.

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 7+
- **RAM**: Minimum 4GB (8GB recommended)
- **CPU**: 2+ cores
- **Storage**: 20GB+ available space
- **Network**: Public IP with DNS configured

### Software Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- curl/wget

## 🎯 Quick Start (Automated)

### 1. Prepare Deployment Package

```bash
# From your local development machine
./prepare-deployment.sh

# This creates: port-digital-twin-YYYYMMDD-HHMMSS.tar.gz
```

### 2. Transfer to Server

```bash
# Upload the deployment package to your server
scp port-digital-twin-*.tar.gz user@your-server:/opt/

# SSH into your server
ssh user@your-server
```

### 3. Deploy on Server

```bash
# Navigate to deployment directory
cd /opt

# Extract deployment package
tar -xzf port-digital-twin-*.tar.gz

# Enter deployment directory
cd port-digital-twin-deploy

# Follow the automated deployment
./start-production.sh
```

## 🛠️ Manual Deployment Steps

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin

# Add user to docker group (optional, for non-root deployment)
sudo usermod -aG docker $USER

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker
```

### Step 2: Clone/Download Application

```bash
# Create application directory
sudo mkdir -p /opt/port-digital-twin
cd /opt/port-digital-twin

# Clone your repository (recommended)
git clone https://github.com/your-username/port-digital-twin.git .

# Or extract deployment package
# tar -xzf /path/to/port-digital-twin-deploy.tar.gz
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp production-config.env.template .env.production

# Edit with your production values
nano .env.production
```

**Required Configuration:**

```bash
# Domain Configuration
DOMAIN=your-domain.com
SSL_EMAIL=admin@your-domain.com

# Database (MongoDB Atlas, AWS DocumentDB, or self-hosted)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/portdt?retryWrites=true&w=majority

# Security
JWT_SECRET=your-32-character-secure-jwt-secret-here

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 4: DNS Configuration

Configure your DNS to point to your server's IP:

```
Type: A
Name: your-domain.com
Value: YOUR_SERVER_IP

Type: A
Name: www.your-domain.com
Value: YOUR_SERVER_IP
```

### Step 5: SSL Certificate Setup

```bash
# Make SSL setup script executable
chmod +x setup-ssl.sh

# Run SSL setup (requires DNS to be configured)
./setup-ssl.sh
```

### Step 6: Deploy Application

```bash
# Make deployment script executable
chmod +x start-production.sh

# Deploy application
./start-production.sh
```

### Step 7: Verify Deployment

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Test health endpoint
curl https://your-domain.com/health

# Test application
open https://your-domain.com
```

## 🔧 Service Architecture

```
Internet
    ↓
Nginx (Port 80/443)
    ↓
├── Frontend (Next.js - Port 3000)
├── Backend (Node.js - Port 5001)
├── DC Power Flow (Python - Port 5002)
└── Vessel Modelling (Python - Port 5003)
    ↓
MongoDB (External)
```

## 📊 Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f dc-power-flow

# Follow logs with timestamps
docker-compose logs -f --timestamps
```

### Service Management
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Stop all services
docker-compose down

# Start services
docker-compose up -d

# Update and rebuild
docker-compose pull && docker-compose up -d --build
```

### SSL Certificate Renewal
```bash
# SSL certificates auto-renew, but manual renewal:
./renew-ssl.sh
```

## 🛡️ Security Checklist

- [ ] ✅ Firewall configured (only ports 22, 80, 443 open)
- [ ] ✅ SSL certificates properly configured
- [ ] ✅ Strong JWT secret (32+ characters)
- [ ] ✅ Database credentials secured
- [ ] ✅ No sensitive data in logs
- [ ] ✅ Regular security updates
- [ ] ✅ Backup strategy in place

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service
sudo systemctl stop apache2
sudo systemctl disable apache2
```

**2. Docker Permission Denied**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Restart session or run:
newgrp docker
```

**3. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose logs certbot

# Manual certificate renewal
./renew-ssl.sh
```

**4. Database Connection Issues**
```bash
# Test database connection
docker-compose exec backend curl -f http://backend:5001/health

# Check database logs
docker-compose logs backend
```

### Performance Optimization

```bash
# Monitor resource usage
docker stats

# View container resource limits
docker-compose ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Clean up unused Docker resources
docker system prune -f
```

## 🔄 Updates & Rollbacks

### Updating Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Verify deployment
curl https://your-domain.com/health
```

### Rollback Strategy
```bash
# Create backup before updates
docker tag your-app:latest your-app:backup-$(date +%Y%m%d)

# Rollback if needed
docker-compose up -d your-app:backup-20240101
```

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: `cat .env.production`
3. Test individual services: `docker-compose exec backend curl http://localhost:5001/health`
4. Review this documentation

## 📋 Checklist Summary

- [ ] Server provisioned with required specifications
- [ ] Docker and Docker Compose installed
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] DNS records configured
- [ ] SSL certificates obtained
- [ ] Services running and healthy
- [ ] Application accessible via HTTPS
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented
- [ ] Security hardening completed

---

**🎉 Your Port Digital Twin is now running in production!**

Access your application at: `https://your-domain.com`
