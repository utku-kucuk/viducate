#!/bin/bash

# Backend Test Scripti

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Backend Test Başlıyor...${NC}"
echo ""

# 1. Backend process kontrolü
echo -e "${YELLOW}1. Backend Process Kontrolü${NC}"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 8080 dinleniyor${NC}"
    PID=$(lsof -Pi :8080 -sTCP:LISTEN -t)
    echo "   Process ID: $PID"
else
    echo -e "${RED}❌ Port 8080 dinlenmiyor!${NC}"
    echo "   Backend çalışmıyor olabilir"
fi

echo ""

# 2. Localhost health check
echo -e "${YELLOW}2. Localhost Health Check${NC}"
HEALTH_LOCAL=$(curl -s http://localhost:8080/api/health)
if [[ "$HEALTH_LOCAL" == *"OK"* ]] || [[ "$HEALTH_LOCAL" == *"running"* ]]; then
    echo -e "${GREEN}✅ Backend localhost'tan erişilebilir${NC}"
    echo "   Response: $HEALTH_LOCAL"
else
    echo -e "${RED}❌ Backend localhost'tan erişilemiyor!${NC}"
    echo "   Response: $HEALTH_LOCAL"
fi

echo ""

# 3. Domain health check
echo -e "${YELLOW}3. Domain Health Check (Nginx üzerinden)${NC}"
HEALTH_DOMAIN=$(curl -s https://edu.mutkukucuk.com/api/health 2>&1)
if [[ "$HEALTH_DOMAIN" == *"OK"* ]] || [[ "$HEALTH_DOMAIN" == *"running"* ]]; then
    echo -e "${GREEN}✅ Backend domain üzerinden erişilebilir${NC}"
    echo "   Response: $HEALTH_DOMAIN"
else
    echo -e "${RED}❌ Backend domain üzerinden erişilemiyor!${NC}"
    echo "   Response: $HEALTH_DOMAIN"
    echo -e "${YELLOW}   Nginx proxy ayarlarını kontrol edin${NC}"
fi

echo ""

# 4. CORS Test
echo -e "${YELLOW}4. CORS Test${NC}"
CORS_TEST=$(curl -s -H "Origin: https://edu.mutkukucuk.com" \
    -H "Access-Control-Request-Method: POST" \
    -X OPTIONS \
    http://localhost:8080/api/auth/login \
    -w "\nHTTP_CODE:%{http_code}" 2>&1)

if [[ "$CORS_TEST" == *"HTTP_CODE:204"* ]] || [[ "$CORS_TEST" == *"HTTP_CODE:200"* ]]; then
    echo -e "${GREEN}✅ CORS preflight başarılı${NC}"
else
    echo -e "${YELLOW}⚠️  CORS preflight yanıtı:${NC}"
    echo "$CORS_TEST"
fi

echo ""

# 5. PM2 Durumu
echo -e "${YELLOW}5. PM2 Durumu${NC}"
PM2_STATUS=$(pm2 list | grep viducate-backend || echo "")
if [ -z "$PM2_STATUS" ]; then
    echo -e "${RED}❌ viducate-backend PM2'de çalışmıyor!${NC}"
else
    echo -e "${GREEN}✅ viducate-backend PM2'de çalışıyor${NC}"
    pm2 list | grep viducate-backend
fi

echo ""

# 6. Son PM2 Logları
echo -e "${YELLOW}6. Son PM2 Logları (CORS ile ilgili)${NC}"
CORS_LOGS=$(pm2 logs viducate-backend --lines 20 --nostream 2>&1 | grep -i "cors\|error" | tail -5)
if [ -z "$CORS_LOGS" ]; then
    echo -e "${GREEN}✅ Son loglarda CORS hatası yok${NC}"
else
    echo -e "${YELLOW}⚠️  Son CORS/Error logları:${NC}"
    echo "$CORS_LOGS"
fi

echo ""
echo -e "${BLUE}📋 Özet${NC}"
echo ""
echo "Eğer localhost çalışıyor ama domain çalışmıyorsa:"
echo "  1. Nginx yapılandırmasını kontrol edin"
echo "  2. Nginx'i restart edin: sudo systemctl restart nginx"
echo "  3. Nginx error log: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "Eğer CORS hatası varsa:"
echo "  1. backend/.env dosyasında FRONTEND_URL kontrol edin"
echo "  2. PM2'yi --update-env ile restart edin: pm2 restart viducate-backend --update-env"
echo ""
