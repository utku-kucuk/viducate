# Viducate Pi 5 Deployment Rehberi

## 🚀 Adım Adım Deployment

### 1. Pi 5'te Hazırlık

```bash
# SSH ile Pi'ye bağlan
ssh pi@your-pi-ip

# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Node.js 18.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu
sudo npm install -g pm2

# Git kurulumu
sudo apt-get install -y git build-essential

# Log klasörü oluştur
mkdir -p /home/pi/logs
```

### 2. Proje Kurulumu

```bash
# Projeyi klonla (GitHub repository'nizi kullanın)
git clone https://github.com/yourusername/viducate.git
cd viducate

# Dependencies kur
npm run install-all

# Production environment dosyası
cp backend/env.production backend/.env
# .env dosyasını düzenleyin ve JWT_SECRET'ı değiştirin
```

### 3. Production Build

```bash
# Deploy script'ini çalıştır
chmod +x deploy.sh
./deploy.sh
```

### 4. Nginx Konfigürasyonu

```bash
# Nginx config dosyasını kopyala
sudo cp nginx-viducate.conf /etc/nginx/sites-available/viducate

# Site'ı aktif et
sudo ln -s /etc/nginx/sites-available/viducate /etc/nginx/sites-enabled/

# Default site'ı devre dışı bırak (eğer varsa)
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx test et
sudo nginx -t

# Nginx restart
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5. Cloudflare Tunnel Kurulumu

```bash
# Cloudflared kurulumu
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb

# Tunnel oluştur
cloudflared tunnel create viducate

# Config dosyasını kopyala
mkdir -p /home/pi/.cloudflared
cp cloudflare-tunnel.yml /home/pi/.cloudflared/config.yml

# Tunnel'ı başlat
cloudflared tunnel run viducate
```

### 6. PM2 ile Backend Başlatma

```bash
# PM2 ile backend'i başlat
pm2 start ecosystem.config.js

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup
pm2 save
```

### 7. Cloudflare DNS Ayarları

Cloudflare dashboard'da:
1. `test.mutkukucuk.com` için CNAME kaydı ekle
2. Target: `viducate-tunnel-id.cfargotunnel.com`
3. Proxy durumu: Proxied (turuncu bulut)

## 🔧 Yönetim Komutları

```bash
# PM2 durum kontrolü
pm2 status
pm2 logs viducate-backend

# Nginx durumu
sudo systemctl status nginx

# Cloudflare tunnel durumu
cloudflared tunnel list

# Log dosyaları
tail -f /home/pi/logs/viducate-backend.log
```

## 🚨 Sorun Giderme

### Backend çalışmıyor:
```bash
pm2 restart viducate-backend
pm2 logs viducate-backend --lines 50
```

### Nginx sorunları:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Cloudflare tunnel sorunları:
```bash
cloudflared tunnel run viducate --loglevel debug
```

## 📁 Dosya Yapısı

```
/home/pi/viducate/
├── backend/
│   ├── src/
│   ├── uploads/
│   └── .env
├── frontend/
│   └── build/
├── ecosystem.config.js
└── deploy.sh
```

## 🔄 Güncelleme Süreci

```bash
# Yeni kod çek
git pull origin main

# Yeniden build et
./deploy.sh

# PM2 restart
pm2 restart viducate-backend
```
