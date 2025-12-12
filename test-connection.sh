#!/bin/bash

# Connection Test Script

echo "🔍 Viducate Connection Test"
echo "============================"
echo ""

# 1. Backend localhost test
echo "1. Testing backend on localhost:8080..."
LOCAL_RESPONSE=$(curl -s http://localhost:8080/api/health)
if [[ "$LOCAL_RESPONSE" == *"OK"* ]] || [[ "$LOCAL_RESPONSE" == *"running"* ]]; then
    echo "✅ Backend çalışıyor (localhost:8080)"
    echo "   Response: $LOCAL_RESPONSE"
else
    echo "❌ Backend çalışmıyor (localhost:8080)"
    echo "   Response: $LOCAL_RESPONSE"
fi
echo ""

# 2. Nginx test (if domain is set)
if [ -n "$1" ]; then
    DOMAIN=$1
else
    DOMAIN="edu.mutkukucuk.com"
fi

echo "2. Testing through Nginx (https://$DOMAIN/api/health)..."
NGINX_RESPONSE=$(curl -s -k https://$DOMAIN/api/health 2>&1)
if [[ "$NGINX_RESPONSE" == *"OK"* ]] || [[ "$NGINX_RESPONSE" == *"running"* ]]; then
    echo "✅ Nginx proxy çalışıyor"
    echo "   Response: $NGINX_RESPONSE"
else
    echo "❌ Nginx proxy çalışmıyor veya erişilemiyor"
    echo "   Response: $NGINX_RESPONSE"
    echo ""
    echo "   HTTP deneyin:"
    HTTP_RESPONSE=$(curl -s http://$DOMAIN/api/health 2>&1)
    echo "   HTTP Response: $HTTP_RESPONSE"
fi
echo ""

# 3. CORS test
echo "3. Testing CORS..."
CORS_RESPONSE=$(curl -s -X OPTIONS https://$DOMAIN/api/auth/login \
  -H "Origin: https://$DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -i "access-control")
if [ -n "$CORS_RESPONSE" ]; then
    echo "✅ CORS headers mevcut"
    echo "$CORS_RESPONSE"
else
    echo "❌ CORS headers bulunamadı"
fi
echo ""

# 4. Port check
echo "4. Checking port 8080..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Port 8080 dinleniyor"
    lsof -i :8080 | head -2
else
    echo "❌ Port 8080 dinlenmiyor"
fi
echo ""

# 5. Nginx status
echo "5. Checking Nginx status..."
if systemctl is-active --quiet nginx 2>/dev/null || service nginx status >/dev/null 2>&1; then
    echo "✅ Nginx çalışıyor"
else
    echo "❌ Nginx çalışmıyor"
fi
echo ""

# 6. Environment check
echo "6. Checking backend environment..."
if [ -f "backend/.env" ]; then
    FRONTEND_URL=$(grep "FRONTEND_URL=" backend/.env | cut -d '=' -f2)
    echo "   FRONTEND_URL: $FRONTEND_URL"
    if [[ "$FRONTEND_URL" == *"$DOMAIN"* ]]; then
        echo "✅ FRONTEND_URL doğru yapılandırılmış"
    else
        echo "⚠️  FRONTEND_URL domain ile eşleşmiyor"
    fi
else
    echo "❌ backend/.env dosyası bulunamadı"
fi
echo ""

echo "============================"
echo "Test tamamlandı!"
