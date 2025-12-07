# 🚀 Viducate Production Deployment Guide - Raspberry Pi 5

Bu rehber, Viducate uygulamasını Raspberry Pi 5'te production ortamına kurmak için adım adım talimatlar içerir.

## 📋 Ön Gereksinimler

- Raspberry Pi 5 (veya benzer ARM64 cihaz)
- Port 80 açık ve erişilebilir
- Domain adı (opsiyonel, IP ile de çalışır)
- GitHub repository erişimi

---

## 🔧 1. İlk Kurulum (İlk Defa Kurulum)

### 1.1. Pi 5'te Sistem Hazırlığı

```bash
# SSH ile Pi'ye bağlan
ssh pi@your-pi-ip

# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Node.js 18.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu (process manager)
sudo npm install -g pm2

# Git kurulumu
sudo apt-get install -y git build-essential

# Nginx kurulumu
sudo apt-get install -y nginx

# FFmpeg kurulumu (video işleme için)
sudo apt-get install -y ffmpeg

# Log klasörü oluştur
mkdir -p /home/pi/logs
```

### 1.2. Projeyi GitHub'dan Klonlama

```bash
# Projeyi klonla (GitHub repository URL'inizi kullanın)
cd /home/pi
git clone https://github.com/YOUR_USERNAME/viducate.git
cd viducate

# Deployment script'lerini çalıştırılabilir yap
chmod +x deploy-production.sh
chmod +x update-production.sh
```

### 1.3. Environment Dosyası Ayarlama

```bash
# Production environment dosyasını oluştur
cp backend/env.production backend/.env

# .env dosyasını düzenle (JWT_SECRET ve diğer ayarları yapın)
nano backend/.env
```

**Önemli ayarlar:**
- `JWT_SECRET`: Güçlü, rastgele bir string (en az 32 karakter)
- `FRONTEND_URL`: Domain veya IP adresiniz (örn: `http://your-domain.com` veya `http://192.168.1.100`)
- `PORT`: Backend portu (varsayılan: 8080)

### 1.4. İlk Deployment

```bash
# Production build ve kurulum
./deploy-production.sh
```

Bu script:
- GitHub'dan son kodu çeker
- Tüm dependencies'leri kurar
- Frontend'i build eder
- Gerekli klasörleri oluşturur

### 1.5. Nginx Konfigürasyonu

```bash
# Nginx config dosyasını kopyala
sudo cp nginx-viducate.conf /etc/nginx/sites-available/viducate

# Domain adınızı güncelleyin (eğer varsa)
sudo nano /etc/nginx/sites-available/viducate
# server_name satırını düzenleyin: test.mutkukucuk.com -> your-domain.com

# Site'ı aktif et
sudo ln -s /etc/nginx/sites-available/viducate /etc/nginx/sites-enabled/

# Default site'ı devre dışı bırak (eğer varsa)
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx config'i test et
sudo nginx -t

# Nginx'i başlat ve otomatik başlatmayı etkinleştir
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 1.6. Backend'i PM2 ile Başlatma

```bash
# PM2 ile backend'i başlat
pm2 start ecosystem.config.js

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup
# Çıkan komutu çalıştırın (sudo ile başlayan komut)

# PM2 durumunu kaydet
pm2 save

# Durumu kontrol et
pm2 status
pm2 logs viducate-backend
```

---

## 🔄 2. Güncelleme (GitHub'dan Yeni Versiyon)

GitHub'da yeni kod push ettiğinizde, sunucuda şu komutu çalıştırın:

```bash
cd /home/pi/viducate
./update-production.sh
```

Bu script:
- GitHub'dan son kodu çeker
- Dependencies'leri günceller
- Frontend'i yeniden build eder
- Backend'i otomatik restart eder

---

## 📊 3. Yönetim Komutları

### PM2 Komutları

```bash
# Durum kontrolü
pm2 status

# Logları görüntüle
pm2 logs viducate-backend
pm2 logs viducate-backend --lines 50  # Son 50 satır

# Restart
pm2 restart viducate-backend

# Stop
pm2 stop viducate-backend

# Start
pm2 start viducate-backend

# Tüm logları temizle
pm2 flush
```

### Nginx Komutları

```bash
# Durum kontrolü
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx

# Config test
sudo nginx -t

# Reload (downtime olmadan)
sudo nginx -s reload
```

### Log Dosyaları

```bash
# Backend logları
tail -f /home/pi/logs/viducate-backend.log

# Nginx error logları
sudo tail -f /var/log/nginx/error.log

# Nginx access logları
sudo tail -f /var/log/nginx/access.log
```

---

## 🔒 4. Güvenlik Ayarları

### Firewall (UFW)

```bash
# UFW kurulumu
sudo apt-get install -y ufw

# HTTP ve HTTPS portlarını aç
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH

# Firewall'u etkinleştir
sudo ufw enable
sudo ufw status
```

### SSL Sertifikası (Let's Encrypt) - Opsiyonel

```bash
# Certbot kurulumu
sudo apt-get install -y certbot python3-certbot-nginx

# SSL sertifikası al (domain adınız varsa)
sudo certbot --nginx -d your-domain.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

---

## 🚨 5. Sorun Giderme

### Backend çalışmıyor

```bash
# PM2 loglarını kontrol et
pm2 logs viducate-backend --lines 100

# .env dosyasını kontrol et
cat backend/.env

# Port kullanımda mı kontrol et
sudo netstat -tulpn | grep 8080

# PM2'yi restart et
pm2 restart viducate-backend
```

### Nginx 502 Bad Gateway hatası

```bash
# Backend'in çalıştığını kontrol et
pm2 status

# Nginx config'i test et
sudo nginx -t

# Backend portunu kontrol et (ecosystem.config.js'de 8080 olmalı)
# Nginx config'de proxy_pass http://localhost:8080 olmalı
```

### Video oynatma sorunları

```bash
# FFmpeg kurulu mu kontrol et
ffmpeg -version

# Video dosyalarının izinlerini kontrol et
ls -la backend/uploads/videos/

# Nginx config'de Accept-Ranges header'ının olduğunu kontrol et
sudo grep -r "Accept-Ranges" /etc/nginx/sites-available/viducate
```

### Disk alanı sorunu

```bash
# Disk kullanımını kontrol et
df -h

# Büyük dosyaları bul
du -sh /home/pi/viducate/backend/uploads/*

# Eski chunk dosyalarını temizle (eğer varsa)
rm -rf /home/pi/viducate/backend/uploads/chunks/*
```

---

## 📁 6. Dosya Yapısı

```
/home/pi/viducate/
├── backend/
│   ├── src/
│   ├── uploads/
│   │   ├── videos/
│   │   ├── thumbnails/
│   │   ├── files/
│   │   └── profile-pictures/
│   ├── viducate.db
│   └── .env
├── frontend/
│   └── build/          # Production build
├── ecosystem.config.js
├── deploy-production.sh
├── update-production.sh
└── nginx-viducate.conf
```

---

## 🔄 7. Otomatik Güncelleme (Opsiyonel)

Cron job ile otomatik güncelleme:

```bash
# Crontab düzenle
crontab -e

# Her gün saat 03:00'da güncelleme yap
0 3 * * * cd /home/pi/viducate && ./update-production.sh >> /home/pi/logs/auto-update.log 2>&1
```

---

## 📝 8. Önemli Notlar

1. **JWT_SECRET**: Mutlaka güçlü ve benzersiz bir secret kullanın
2. **Database**: SQLite kullanılıyor, backup almayı unutmayın
3. **Uploads**: Video dosyaları büyük olabilir, disk alanını takip edin
4. **Port**: Backend 8080, Nginx 80 portunda çalışıyor
5. **Memory**: Pi 5 için 1GB memory limit ayarlanmış (PM2 config'de)

---

## 🎯 Hızlı Başlangıç (Özet)

```bash
# 1. Sistem hazırlığı
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential nginx ffmpeg
sudo npm install -g pm2

# 2. Projeyi klonla
cd /home/pi
git clone https://github.com/YOUR_USERNAME/viducate.git
cd viducate
chmod +x *.sh

# 3. Environment ayarla
cp backend/env.production backend/.env
nano backend/.env  # JWT_SECRET ve FRONTEND_URL'i ayarla

# 4. Deploy et
./deploy-production.sh

# 5. Nginx ayarla
sudo cp nginx-viducate.conf /etc/nginx/sites-available/viducate
sudo ln -s /etc/nginx/sites-available/viducate /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 6. Backend'i başlat
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

---

## ✅ Kurulum Kontrol Listesi

- [ ] Node.js 18.x kurulu
- [ ] PM2 kurulu
- [ ] Nginx kurulu
- [ ] FFmpeg kurulu
- [ ] Proje GitHub'dan klonlandı
- [ ] backend/.env dosyası oluşturuldu ve ayarlandı
- [ ] deploy-production.sh çalıştırıldı
- [ ] Nginx config dosyası kopyalandı ve aktif edildi
- [ ] PM2 ile backend başlatıldı
- [ ] PM2 startup ayarlandı
- [ ] Port 80 erişilebilir
- [ ] Uygulama tarayıcıdan açılıyor

---

**Sorularınız için:** GitHub Issues veya dokümantasyonu kontrol edin.

