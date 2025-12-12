#!/bin/bash

# Viducate Deployment Kontrol Scripti
# Bu script backend'in çalışıp çalışmadığını ve yapılandırmaları kontrol eder

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Viducate Deployment Kontrolü Başlıyor...${NC}"
echo ""

# 1. Backend .env dosyası kontrolü
echo -e "${YELLOW}1. Backend .env dosyası kontrol ediliyor...${NC}"
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ backend/.env dosyası mevcut${NC}"
    
    # FRONTEND_URL kontrolü
    if grep -q "FRONTEND_URL=https://edu.mutkukucuk.com" backend/.env; then
        echo -e "${GREEN}✅ FRONTEND_URL doğru yapılandırılmış${NC}"
    else
        echo -e "${RED}❌ FRONTEND_URL yanlış veya eksik!${NC}"
        echo -e "${YELLOW}   backend/.env dosyasında FRONTEND_URL=https://edu.mutkukucuk.com olmalı${NC}"
    fi
    
    # JWT_SECRET kontrolü
    if grep -q "JWT_SECRET=" backend/.env && ! grep -q "JWT_SECRET=your-secret-key" backend/.env; then
        echo -e "${GREEN}✅ JWT_SECRET ayarlanmış${NC}"
    else
        echo -e "${RED}❌ JWT_SECRET varsayılan değerde! Güvenlik riski!${NC}"
        echo -e "${YELLOW}   backend/.env dosyasında JWT_SECRET'ı değiştirin${NC}"
    fi
    
    # PORT kontrolü
    if grep -q "PORT=8080" backend/.env; then
        echo -e "${GREEN}✅ PORT doğru yapılandırılmış (8080)${NC}"
    else
        echo -e "${YELLOW}⚠️  PORT 8080 olmalı${NC}"
    fi
else
    echo -e "${RED}❌ backend/.env dosyası bulunamadı!${NC}"
    echo -e "${YELLOW}   backend/env.production dosyasını backend/.env olarak kopyalayın:${NC}"
    echo -e "${YELLOW}   cp backend/env.production backend/.env${NC}"
fi

echo ""

# 2. PM2 durumu kontrolü
echo -e "${YELLOW}2. PM2 durumu kontrol ediliyor...${NC}"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep viducate-backend || echo "")
    if [ -z "$PM2_STATUS" ]; then
        echo -e "${RED}❌ viducate-backend PM2'de çalışmıyor!${NC}"
        echo -e "${YELLOW}   PM2'yi başlatmak için: pm2 start ecosystem.config.js${NC}"
    else
        echo -e "${GREEN}✅ viducate-backend PM2'de çalışıyor${NC}"
        pm2 list | grep viducate-backend
    fi
else
    echo -e "${RED}❌ PM2 yüklü değil!${NC}"
    echo -e "${YELLOW}   PM2'yi yüklemek için: npm install -g pm2${NC}"
fi

echo ""

# 3. Backend port kontrolü
echo -e "${YELLOW}3. Backend port (8080) kontrol ediliyor...${NC}"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 8080 dinleniyor${NC}"
else
    echo -e "${RED}❌ Port 8080 dinlenmiyor!${NC}"
    echo -e "${YELLOW}   Backend çalışmıyor olabilir${NC}"
fi

echo ""

# 4. Backend health check
echo -e "${YELLOW}4. Backend health check yapılıyor...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:8080/api/health || echo "ERROR")
if [[ "$HEALTH_RESPONSE" == *"OK"* ]] || [[ "$HEALTH_RESPONSE" == *"running"* ]]; then
    echo -e "${GREEN}✅ Backend sağlıklı çalışıyor${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Backend health check başarısız!${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    echo -e "${YELLOW}   PM2 loglarını kontrol edin: pm2 logs viducate-backend${NC}"
fi

echo ""

# 5. Database dosyası kontrolü
echo -e "${YELLOW}5. Database dosyası kontrol ediliyor...${NC}"
DB_STORAGE=$(grep "DB_STORAGE=" backend/.env 2>/dev/null | cut -d '=' -f2 || echo "")
if [ -z "$DB_STORAGE" ]; then
    DB_STORAGE="./backend/viducate.db"
fi

# Tilde expansion
DB_STORAGE="${DB_STORAGE/#\~/$HOME}"

if [ -f "$DB_STORAGE" ]; then
    echo -e "${GREEN}✅ Database dosyası mevcut: $DB_STORAGE${NC}"
    DB_SIZE=$(du -h "$DB_STORAGE" | cut -f1)
    echo "   Boyut: $DB_SIZE"
else
    echo -e "${YELLOW}⚠️  Database dosyası bulunamadı: $DB_STORAGE${NC}"
    echo -e "${YELLOW}   İlk çalıştırmada otomatik oluşturulacak${NC}"
fi

echo ""

# 6. Nginx kontrolü
echo -e "${YELLOW}6. Nginx durumu kontrol ediliyor...${NC}"
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx 2>/dev/null || service nginx status >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Nginx çalışıyor${NC}"
    else
        echo -e "${RED}❌ Nginx çalışmıyor!${NC}"
        echo -e "${YELLOW}   Nginx'i başlatmak için: sudo systemctl start nginx${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Nginx yüklü değil veya kontrol edilemiyor${NC}"
fi

echo ""

# 7. Uploads klasörü kontrolü
echo -e "${YELLOW}7. Uploads klasörleri kontrol ediliyor...${NC}"
UPLOAD_DIRS=("backend/uploads/videos" "backend/uploads/thumbnails" "backend/uploads/files" "backend/uploads/profile-pictures" "backend/uploads/chunks")
for dir in "${UPLOAD_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $dir mevcut${NC}"
    else
        echo -e "${YELLOW}⚠️  $dir eksik, oluşturuluyor...${NC}"
        mkdir -p "$dir"
        chmod 755 "$dir"
    fi
done

echo ""
echo -e "${BLUE}📋 Özet:${NC}"
echo ""
echo "Eğer sorunlar varsa:"
echo "  1. backend/.env dosyasını kontrol edin"
echo "  2. PM2 loglarını kontrol edin: pm2 logs viducate-backend"
echo "  3. Nginx loglarını kontrol edin: sudo tail -f /var/log/nginx/error.log"
echo "  4. Backend'i yeniden başlatın: pm2 restart viducate-backend"
echo ""
