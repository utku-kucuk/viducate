#!/bin/bash

# Viducate Production Güncelleme Script'i
# GitHub'dan son versiyonu çekip günceller

set -e

# Renkli output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Viducate Production Güncelleme Başlıyor...${NC}"

cd /home/pi/viducate

# Git durumu kontrolü
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Git repository bulunamadı!${NC}"
    exit 1
fi

# Değişiklikleri kaydet (stash)
echo -e "${YELLOW}💾 Yerel değişiklikler kaydediliyor...${NC}"
git stash || true

# GitHub'dan güncellemeleri çek
echo -e "${YELLOW}📥 GitHub'dan güncellemeler çekiliyor...${NC}"
git fetch origin
git pull origin main || git pull origin master

# Dependencies güncelle
echo -e "${YELLOW}📦 Dependencies güncelleniyor...${NC}"
npm install --production=false
cd backend && npm install --production=false && cd ..
cd frontend && npm install --production=false && cd ..

# Frontend rebuild
echo -e "${YELLOW}🏗️  Frontend yeniden build ediliyor...${NC}"
cd frontend
npm run build
cd ..

# PM2 restart
echo -e "${YELLOW}🔄 Backend yeniden başlatılıyor...${NC}"
pm2 restart viducate-backend || pm2 start ecosystem.config.js

# PM2 kaydet
pm2 save

echo -e "${GREEN}✅ Güncelleme tamamlandı!${NC}"
echo -e "${GREEN}📊 PM2 durumu:${NC}"
pm2 status

