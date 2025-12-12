#!/bin/bash
# Script to fix backend/.env paths if they point to /home/pi

ENV_FILE="backend/.env"
PROJECT_DIR=$(pwd)

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found!"
    exit 1
fi

echo "🔍 Checking $ENV_FILE for incorrect paths..."

# Replace /home/pi/viducate with current directory
sed -i "s|/home/pi/viducate|$PROJECT_DIR|g" "$ENV_FILE"

echo "✅ Updated paths in $ENV_FILE to $PROJECT_DIR"
echo "Please restart backend: pm2 restart viducate-backend"
