#!/bin/bash

# Viducate Production Deployment Script for Raspberry Pi 5
# GitHub'dan güncelleme yaparak kurulum

set -e

# Renkli output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Viducate Production Deployment Başlıyor...${NC}"

# Proje dizini kontrolü
if [ ! -d "/home/pi/viducate" ]; then
    echo -e "${RED}❌ /home/pi/viducate dizini bulunamadı!${NC}"
    echo "Lütfen önce projeyi GitHub'dan klonlayın:"
    echo "  git clone https://github.com/YOUR_USERNAME/viducate.git /home/pi/viducate"
    exit 1
fi

cd /home/pi/viducate

# Git durumu kontrolü
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 GitHub'dan güncellemeler çekiliyor...${NC}"
    git fetch origin
    git pull origin main || git pull origin master
    echo -e "${GREEN}✅ Kod güncellemesi tamamlandı${NC}"
else
    echo -e "${YELLOW}⚠️  Git repository bulunamadı, mevcut kodla devam ediliyor...${NC}"
fi

# Dependencies kurulumu
echo -e "${YELLOW}📦 Dependencies kuruluyor...${NC}"
npm install --production=false
cd backend && npm install --production=false && cd ..
cd frontend && npm install --production=false && cd ..

# Environment dosyası kontrolü
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}⚠️  backend/.env dosyası bulunamadı, env.production'dan oluşturuluyor...${NC}"
    if [ -f backend/env.production ]; then
        cp backend/env.production backend/.env
        echo -e "${RED}⚠️  ÖNEMLİ: backend/.env dosyasını düzenleyip JWT_SECRET ve diğer ayarları yapın!${NC}"
    else
        echo -e "${RED}❌ backend/env.production dosyası bulunamadı!${NC}"
        exit 1
    fi
fi

# Frontend build
echo -e "${YELLOW}🏗️  Frontend build ediliyor...${NC}"
cd frontend
npm run build
cd ..

# Uploads klasörleri oluştur
echo -e "${YELLOW}📁 Uploads klasörleri oluşturuluyor...${NC}"
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/thumbnails
mkdir -p backend/uploads/files
mkdir -p backend/uploads/profile-pictures
mkdir -p backend/uploads/chunks

# Log klasörü
mkdir -p /home/pi/logs

# İzinleri ayarla
chmod -R 755 backend/uploads
chmod -R 755 frontend/build

echo -e "${GREEN}✅ Build tamamlandı!${NC}"
echo -e "${GREEN}🚀 Production'a hazır!${NC}"
echo ""
echo -e "${YELLOW}📝 Sonraki adımlar:${NC}"
echo "  1. backend/.env dosyasını kontrol edin"
echo "  2. PM2 ile backend'i başlatın: pm2 start ecosystem.config.js"
echo "  3. Nginx'i restart edin: sudo systemctl restart nginx"
echo "  4. PM2'yi kaydedin: pm2 save"

