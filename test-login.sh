#!/bin/bash

# Login Test Script

echo "🔐 Viducate Login Test"
echo "======================"
echo ""

DOMAIN="edu.mutkukucuk.com"
EMAIL="teacher1@example.com"
PASSWORD="teacher123"

echo "1. Testing login endpoint..."
echo "   Email: $EMAIL"
echo ""

# Test login
RESPONSE=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://$DOMAIN" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Login başarılı!"
    TOKEN=$(echo "$BODY" | jq -r '.token' 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "✅ Token alındı: ${TOKEN:0:20}..."
        echo ""
        echo "2. Testing profile endpoint with token..."
        PROFILE_RESPONSE=$(curl -s -X GET https://$DOMAIN/api/auth/profile \
          -H "Authorization: Bearer $TOKEN" \
          -H "Origin: https://$DOMAIN")
        echo "$PROFILE_RESPONSE" | jq . 2>/dev/null || echo "$PROFILE_RESPONSE"
    else
        echo "⚠️  Token alınamadı"
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Login başarısız - Kullanıcı adı veya şifre yanlış"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ Login başarısız - Hesap devre dışı"
else
    echo "❌ Login başarısız - HTTP $HTTP_CODE"
fi

echo ""
echo "3. Testing CORS headers..."
CORS_HEADERS=$(curl -s -I -X OPTIONS https://$DOMAIN/api/auth/login \
  -H "Origin: https://$DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" | grep -i "access-control")

if [ -n "$CORS_HEADERS" ]; then
    echo "✅ CORS headers mevcut:"
    echo "$CORS_HEADERS"
else
    echo "❌ CORS headers bulunamadı"
fi

echo ""
echo "======================"
echo "Test tamamlandı!"
