#!/bin/bash

# Login Test Script

echo "🔐 Viducate Login Test"
echo "======================"
echo ""

DOMAIN="edu.mutkukucuk.com"

# Test 1: Health check
echo "1. Testing health endpoint..."
HEALTH=$(curl -s https://$DOMAIN/api/health)
echo "   Response: $HEALTH"
echo ""

# Test 2: Login endpoint (without credentials)
echo "2. Testing login endpoint (should return validation error)..."
LOGIN_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{}')
echo "   Response: $LOGIN_RESPONSE"
echo ""

# Test 3: Login with test credentials
echo "3. Testing login with teacher1 credentials..."
LOGIN_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://$DOMAIN" \
  -d '{"email":"teacher1@example.com","password":"teacher123"}')
echo "   Response: $LOGIN_RESPONSE"
echo ""

# Test 4: CORS preflight
echo "4. Testing CORS preflight..."
CORS_RESPONSE=$(curl -s -X OPTIONS https://$DOMAIN/api/auth/login \
  -H "Origin: https://$DOMAIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -i "access-control")
if [ -n "$CORS_RESPONSE" ]; then
    echo "   ✅ CORS headers present:"
    echo "$CORS_RESPONSE"
else
    echo "   ❌ CORS headers missing"
fi
echo ""

# Test 5: Check backend logs
echo "5. Recent backend logs (last 10 lines)..."
pm2 logs viducate-backend --lines 10 --nostream | tail -10
echo ""

echo "======================"
echo "Test completed!"
