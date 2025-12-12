#!/bin/bash

# Viducate Universal Deployment Script
# Works on any user/home directory setup

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CURRENT_USER=$(whoami)
USER_HOME=$(eval echo ~$CURRENT_USER)
PROJECT_DIR="$PWD"
DOMAIN_NAME=""

echo -e "${BLUE}🚀 Viducate Deployment Wizard${NC}"
echo "Current User: $CURRENT_USER"
echo "Project Directory: $PROJECT_DIR"

# Get Domain Name
while [[ -z "$DOMAIN_NAME" ]]; do
    read -p "Enter your domain name (e.g., test.mutkukucuk.com): " DOMAIN_NAME
done

echo -e "${YELLOW}📝 Configuration:${NC}"
echo "  User: $CURRENT_USER"
echo "  Home: $USER_HOME"
echo "  Dir:  $PROJECT_DIR"
echo "  Domain: $DOMAIN_NAME"
echo ""
read -p "Is this correct? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Aborted.${NC}"
    exit 1
fi

# 1. System Dependencies
echo -e "${YELLOW}📦 Install System Dependencies...${NC}"
sudo apt update
sudo apt install -y nodejs npm git build-essential nginx

# Install PM2 globally if not exists
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 2. Project Dependencies
echo -e "${YELLOW}📦 Installing Project Dependencies...${NC}"
npm install --production=false
cd backend && npm install --production=false && cd ..
cd frontend && npm install --production=false && cd ..

# 3. Environment Setup
echo -e "${YELLOW}🔧 Setting up Environment...${NC}"
if [ ! -f backend/.env ]; then
    if [ -f backend/env.production ]; then
        cp backend/env.production backend/.env
        # Replace hardcoded paths with actual project directory
        sed -i "s|/home/pi/viducate|$PROJECT_DIR|g" backend/.env
        echo -e "${YELLOW}⚠️  Created backend/.env from default and updated paths to $PROJECT_DIR.${NC}"
    else
        echo -e "${RED}❌ backend/env.production not found!${NC}"
        exit 1
    fi
fi

# 4. Logs Directory
mkdir -p "$USER_HOME/logs"
echo "Logs directory created at $USER_HOME/logs"

# 5. Build Frontend
echo -e "${YELLOW}🏗️  Building Frontend...${NC}"
cd frontend
npm run build
cd ..

# 6. Generate Config Files
echo -e "${YELLOW}📄 Generating Configuration Files...${NC}"

# PM2 Config
sed "s|{{PROJECT_PATH}}|$PROJECT_DIR|g" deployment/ecosystem.config.js.template > ecosystem.config.js
echo "Generated ecosystem.config.js"

# Nginx Config
sed -e "s|{{PROJECT_PATH}}|$PROJECT_DIR|g" \
    -e "s|{{DOMAIN_NAME}}|$DOMAIN_NAME|g" \
    deployment/nginx.conf.template > nginx-viducate.conf
echo "Generated nginx-viducate.conf"

# 7. Upload Directories
echo -e "${YELLOW}📁 Creating Upload Directories...${NC}"
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/thumbnails
mkdir -p backend/uploads/files
mkdir -p backend/uploads/profile-pictures
mkdir -p backend/uploads/chunks
chmod -R 755 backend/uploads

# 8. Setup Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
sudo cp nginx-viducate.conf "/etc/nginx/sites-available/$DOMAIN_NAME"
sudo ln -sf "/etc/nginx/sites-available/$DOMAIN_NAME" "/etc/nginx/sites-enabled/"
sudo rm -f /etc/nginx/sites-enabled/default

echo "Testing Nginx Config..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx configured and restarted.${NC}"
else
    echo -e "${RED}❌ Nginx config test failed!${NC}"
    exit 1
fi

# 9. Start Application
echo -e "${YELLOW}🚀 Starting Application with PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup | grep "sudo" | bash || true # Attempt to run startup script output if possible, or warn user

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}Your app should be live at http://$DOMAIN_NAME${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Check backend/.env and update JWT_SECRET!${NC}"
