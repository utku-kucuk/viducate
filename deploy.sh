#!/bin/bash

# Viducate Production Deployment Script
# Pi 5 için optimize edilmiş

echo "🚀 Viducate Production Deployment Başlıyor..."

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hata durumunda scripti durdur
set -e

echo -e "${YELLOW}📦 Dependencies kuruluyor...${NC}"
npm run install-all

echo -e "${YELLOW}🏗️  Frontend build ediliyor...${NC}"
cd frontend
npm run build
cd ..

echo -e "${YELLOW}📁 Uploads klasörü oluşturuluyor...${NC}"
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/thumbnails

echo -e "${YELLOW}🔧 Environment dosyası kontrol ediliyor...${NC}"
if [ ! -f backend/.env ]; then
    echo -e "${RED}❌ backend/.env dosyası bulunamadı!${NC}"
    echo "Lütfen backend/.env dosyasını oluşturun."
    exit 1
fi

echo -e "${GREEN}✅ Build tamamlandı!${NC}"
echo -e "${GREEN}🚀 Production'a hazır!${NC}"
