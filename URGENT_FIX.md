# Acil Düzeltme - Tüm Sorunlar

## Tespit Edilen Sorunlar

1. ❌ **HTTPS çalışmıyor** - "This site can't be reached" hatası
2. ⚠️ **Syntax hatası** - Eski loglarda görünüyor (cache olabilir)
3. ⚠️ **Database tablo isimleri** - Tablolar var ama kod bulamıyor
4. ❌ **CORS headers yok**

## Hemen Yapılacaklar

### 1. Syntax Hatasını Temizle (Cache Temizleme)

```bash
cd ~/viducate
# PM2'yi tamamen durdur
pm2 delete viducate-backend

# Node modules cache temizle
cd backend
rm -rf node_modules/.cache
cd ..

# PM2'yi yeniden başlat
pm2 start ecosystem.config.js
pm2 save
```

### 2. HTTPS Yapılandırması

**ÖNEMLİ:** Nginx yapılandırma dosyanızda HTTPS (443) bloğu olmalı!

```bash
sudo nano /etc/nginx/sites-available/edu.mutkukucuk.com
```

**TAM YAPILANDIRMA:**

```nginx
# HTTP'den HTTPS'e yönlendirme
server {
    listen 80;
    server_name edu.mutkukucuk.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name edu.mutkukucuk.com;
    
    # SSL sertifikaları (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/edu.mutkukucuk.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edu.mutkukucuk.com/privkey.pem;
    
    # SSL yapılandırması
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

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

    # Video uploads
    location /uploads/ {
        alias /home/utku/viducate/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
        add_header Accept-Ranges bytes;
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

### 3. SSL Sertifikası Kurulumu

Eğer SSL sertifikası yoksa:

```bash
# Certbot yükle (eğer yoksa)
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# SSL sertifikası oluştur
sudo certbot --nginx -d edu.mutkukucuk.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

### 4. Nginx'i Test Et ve Yeniden Yükle

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Port 443 Kontrolü

```bash
# Port 443'ün açık olduğundan emin olun
sudo netstat -tlnp | grep 443

# Firewall kontrolü
sudo ufw status
sudo ufw allow 443/tcp
```

### 6. Kodu Güncelle ve Backend'i Yeniden Başlat

```bash
cd ~/viducate
git pull origin main
cd backend
npm install
cd ..

# PM2'yi tamamen yeniden başlat
pm2 delete viducate-backend
pm2 start ecosystem.config.js --update-env
pm2 save
pm2 logs viducate-backend --lines 30
```

### 7. Test

```bash
# HTTP test (HTTPS'e yönlendirmeli)
curl -I http://edu.mutkukucuk.com

# HTTPS test
curl -I https://edu.mutkukucuk.com

# API test
curl https://edu.mutkukucuk.com/api/health
```

## Beklenen Sonuçlar

✅ `http://edu.mutkukucuk.com` → `https://edu.mutkukucuk.com`'a yönlendirmeli
✅ `https://edu.mutkukucuk.com` → Site açılmalı
✅ `https://edu.mutkukucuk.com/api/health` → JSON response dönmeli
✅ Login sayfası açılmalı ve CORS hatası olmamalı

## Sorun Devam Ederse

1. **Nginx error log:**
   ```bash
   sudo tail -100 /var/log/nginx/error.log
   ```

2. **PM2 logs:**
   ```bash
   pm2 logs viducate-backend --lines 100
   ```

3. **SSL test:**
   ```bash
   openssl s_client -connect edu.mutkukucuk.com:443 -servername edu.mutkukucuk.com
   ```

4. **DNS kontrolü:**
   ```bash
   nslookup edu.mutkukucuk.com
   dig edu.mutkukucuk.com
   ```

## Önemli Notlar

- **Router'da port 443 açık olmalı** ve sunucunuza yönlendirilmeli
- **SSL sertifikası geçerli olmalı** (Let's Encrypt ücretsiz)
- **Nginx hem HTTP (80) hem HTTPS (443) dinlemeli**
- **Backend sadece localhost:8080'de çalışıyor** (Nginx proxy yapıyor)
