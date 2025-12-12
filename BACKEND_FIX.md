# Backend 500 Hatası Düzeltme Kılavuzu

## Sorun
Frontend çalışıyor ama backend 500 hatası veriyor ve login yapılamıyor.

## Hızlı Çözüm Adımları

### 1. Backend .env Dosyasını Oluştur/Düzelt

Sunucuda şu komutu çalıştırın:

```bash
cd /path/to/viducate
cp backend/env.production backend/.env
```

Ardından `backend/.env` dosyasını düzenleyin:

```bash
nano backend/.env
```

Şu değerleri kontrol edin ve gerekirse düzeltin:

```env
NODE_ENV=production
PORT=8080

# Database (SQLite kullanıyorsanız)
DB_STORAGE=/path/to/viducate/backend/viducate.db

# Frontend URL - ÖNEMLİ: Domain'inizi buraya yazın
FRONTEND_URL=https://edu.mutkukucuk.com

# JWT Secret - ÖNEMLİ: Güçlü bir secret oluşturun
JWT_SECRET=your-very-strong-secret-key-here-change-this

# File upload settings
MAX_FILE_SIZE=5GB
UPLOAD_PATH=/path/to/viducate/backend/uploads
```

### 2. PM2 ile Backend'i Başlat/Yeniden Başlat

```bash
# PM2'yi durdur
pm2 stop viducate-backend

# PM2'yi sil (eğer varsa)
pm2 delete viducate-backend

# Backend'i başlat
pm2 start ecosystem.config.js

# PM2'yi kaydet
pm2 save

# Logları kontrol et
pm2 logs viducate-backend
```

### 3. Backend'in Çalıştığını Kontrol Et

```bash
# Health check
curl http://localhost:8080/api/health

# Veya tarayıcıda
# http://edu.mutkukucuk.com/api/health
```

### 4. Nginx Yapılandırmasını Kontrol Et

Nginx yapılandırma dosyanızı kontrol edin (`/etc/nginx/sites-available/edu.mutkukucuk.com` veya benzeri):

```nginx
# Backend API
location /api/ {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

Nginx'i yeniden yükleyin:

```bash
sudo nginx -t  # Yapılandırmayı test et
sudo systemctl reload nginx  # Veya restart
```

### 5. Otomatik Kontrol Scripti

Proje root dizininde kontrol scriptini çalıştırın:

```bash
./check-deployment.sh
```

Bu script şunları kontrol eder:
- ✅ Backend .env dosyası
- ✅ PM2 durumu
- ✅ Port 8080
- ✅ Backend health check
- ✅ Database dosyası
- ✅ Nginx durumu
- ✅ Uploads klasörleri

## Yaygın Sorunlar ve Çözümleri

### Sorun: "Cannot find module" hatası
**Çözüm:** Dependencies'leri yeniden yükleyin:
```bash
cd backend
npm install
```

### Sorun: Database bağlantı hatası
**Çözüm:** Database dosyasının path'ini kontrol edin ve klasör izinlerini ayarlayın:
```bash
ls -la backend/viducate.db
chmod 644 backend/viducate.db
```

### Sorun: CORS hatası
**Çözüm:** `backend/.env` dosyasında `FRONTEND_URL` değerinin doğru olduğundan emin olun:
```env
FRONTEND_URL=https://edu.mutkukucuk.com
```

### Sorun: Port zaten kullanımda
**Çözüm:** Port 8080'i kullanan başka bir process olup olmadığını kontrol edin:
```bash
lsof -i :8080
# Eğer başka bir process varsa, onu durdurun veya PORT değerini değiştirin
```

## Log Kontrolü

### PM2 Logları
```bash
# Son 100 satır
pm2 logs viducate-backend --lines 100

# Canlı log takibi
pm2 logs viducate-backend
```

### Nginx Logları
```bash
# Error log
sudo tail -f /var/log/nginx/error.log

# Access log
sudo tail -f /var/log/nginx/access.log
```

## Test

Backend çalıştıktan sonra şu endpoint'leri test edin:

1. **Health Check:**
   ```bash
   curl https://edu.mutkukucuk.com/api/health
   ```

2. **Login Test:**
   Tarayıcıda login sayfasına gidin ve giriş yapmayı deneyin.

3. **API Test:**
   ```bash
   curl -X POST https://edu.mutkukucuk.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

## İletişim

Sorun devam ederse, PM2 loglarını ve Nginx error loglarını kontrol edin ve hata mesajlarını not edin.
