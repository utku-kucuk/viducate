# Hızlı Düzeltme Talimatları

## Yapılan Düzeltmeler

1. ✅ **Syntax hatası düzeltildi** - `videoController.js` dosyasındaki multer yapılandırması
2. ✅ **Nginx hatası düzeltildi** - `must-revalidate` geçersiz değeri kaldırıldı
3. ✅ **Database tablo isimleri** - SQLite case-sensitivity sorunu çözüldü
4. ✅ **CORS yapılandırması** - Domain varyasyonları eklendi

## Sunucuda Yapılacaklar

### 1. Kodu Güncelle
```bash
cd ~/viducate
git pull origin main
```

### 2. Backend Dependencies'leri Güncelle
```bash
cd backend
npm install
cd ..
```

### 3. Nginx Yapılandırmasını Düzelt

Nginx yapılandırma dosyanızı düzenleyin (`/etc/nginx/sites-available/edu.mutkukucuk.com`):

**22. satırı bulun ve şu şekilde değiştirin:**
```nginx
# ÖNCE (hatalı):
gzip_proxied expired no-cache no-store private must-revalidate auth;

# SONRA (doğru):
gzip_proxied expired no-cache no-store private auth;
```

Veya tüm dosyayı yeniden oluşturun:
```bash
sudo nano /etc/nginx/sites-available/edu.mutkukucuk.com
```

Şu içeriği kullanın (path'leri kendi sisteminize göre ayarlayın):
```nginx
server {
    listen 80;
    server_name edu.mutkukucuk.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Allow large video uploads
    client_max_body_size 5G;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Frontend (React build)
    location / {
        root /home/utku/viducate/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

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

    # Video uploads - Range request support for streaming
    location /uploads/ {
        alias /home/utku/viducate/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
        add_header Accept-Ranges bytes;
        
        # Specific settings for video files (critical for streaming)
        location ~* \.(mp4|webm|avi|mov|wmv|flv|mkv)$ {
            add_header Cache-Control "public, max-age=3600";
            add_header Accept-Ranges bytes;
            
            # Optimized settings for video streaming
            sendfile on;
            tcp_nopush on;
            tcp_nodelay on;
            
            # For Range request support
            proxy_max_temp_file_size 0;
        }
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8080/api/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Nginx'i Test Et ve Yeniden Yükle
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Backend'i Yeniden Başlat
```bash
pm2 restart viducate-backend
pm2 logs viducate-backend --lines 20
```

### 6. Kontrol Et
```bash
# Health check
curl http://localhost:8080/api/health

# Veya tarayıcıda
# https://edu.mutkukucuk.com/api/health
```

## Beklenen Sonuç

- ✅ Backend syntax hatası olmadan başlamalı
- ✅ Nginx hatasız çalışmalı
- ✅ CORS hatası çözülmeli
- ✅ Login çalışmalı

## Sorun Devam Ederse

1. **PM2 loglarını kontrol edin:**
   ```bash
   pm2 logs viducate-backend --lines 50
   ```

2. **Nginx error loglarını kontrol edin:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Backend .env dosyasını kontrol edin:**
   ```bash
   cat backend/.env | grep FRONTEND_URL
   # Şu satırı görmelisiniz:
   # FRONTEND_URL=https://edu.mutkukucuk.com
   ```

4. **Port kontrolü:**
   ```bash
   lsof -i :8080
   # Backend process'i görmelisiniz
   ```
