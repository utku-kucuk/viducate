#!/bin/bash

echo "🧹 Viducate System Cleanup Script"
echo "=================================="

# Kill all Node.js processes
echo "🔪 Killing all Node.js processes..."
pkill -f "node" || true
pkill -f "nodemon" || true

# Kill specific ports if they're in use
echo "🔌 Freeing up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Clear npm cache
echo "🗑️  Clearing npm cache..."
npm cache clean --force

# Clear node_modules (optional - uncomment if needed)
# echo "🗑️  Removing node_modules..."
# rm -rf node_modules
# rm -rf frontend/node_modules
# rm -rf backend/node_modules

# Clear package-lock files (optional - uncomment if needed)
# echo "🗑️  Removing package-lock files..."
# rm -f package-lock.json
# rm -f frontend/package-lock.json
# rm -f backend/package-lock.json

# Clear browser cache (macOS)
echo "🌐 Clearing browser cache..."
rm -rf ~/Library/Caches/Google/Chrome/Default/Cache/* 2>/dev/null || true
rm -rf ~/Library/Caches/Mozilla/Firefox/Profiles/*/cache2/* 2>/dev/null || true

# Clear system cache
echo "💾 Clearing system cache..."
sudo purge 2>/dev/null || true

# Clear Docker cache (if using Docker)
echo "🐳 Clearing Docker cache..."
docker system prune -f 2>/dev/null || true

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "🚀 To restart the system:"
echo "1. cd /Users/utkukucuk/Documents/Projects/Web/viducate"
echo "2. npm run dev"
echo ""
echo "📋 Test User Credentials:"
echo "====================================="
echo "ADMIN USERS:"
echo "admin1@viducate.com / admin123"
echo "admin2@viducate.com / admin123"
echo ""
echo "STUDENT USERS:"
echo "student1@viducate.com / student123"
echo "student2@viducate.com / student123"
echo ""
echo "TEACHER USERS:"
echo "teacher1@viducate.com / teacher123"
echo "teacher2@viducate.com / teacher123"
echo "====================================="
