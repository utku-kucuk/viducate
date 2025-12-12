# CORS ve Health Endpoint Düzeltmeleri

## Sorunlar

1. **CORS hatası** - Frontend'den gelen istekler engelleniyor
2. **Health endpoint çalışmıyor** - `/api/health` tarayıcıda görünmüyor
3. **Database tablo isimleri** - SQLite case-sensitivity uyarıları

## Yapılan Düzeltmeler

1. ✅ CORS origin kontrolü iyileştirildi - hostname bazlı eşleştirme eklendi
2. ✅ Database tablo ismi bulma fonksiyonu iyileştirildi
3. ✅ Health endpoint route kontrolü

## Sunucuda Yapılacaklar

### 1. Kodu Güncelle
```bash
cd ~/viducate
git pull origin main
cd backend
npm install
cd ..
```

### 2. Backend .env Dosyasını Kontrol Et
```bash
cat backend/.env | grep FRONTEND_URL
```

Şu satırı görmelisiniz:
```
FRONTEND_URL=https://edu.mutkukucuk.com
```

Eğer yoksa veya yanlışsa:
```bash
nano backend/.env
```

### 3. CORS Debug için Log Kontrolü

Backend'i yeniden başlattıktan sonra, CORS loglarını kontrol edin:
```bash
pm2 restart viducate-backend
pm2 logs viducate-backend --lines 30 | grep -i cors
```

### 4. Health Endpoint Testi

**Localhost'tan test:**
```bash
curl -v http://localhost:8080/api/health
```

**Nginx üzerinden test:**
```bash
curl -v https://edu.mutkukucuk.com/api/health
```

**Tarayıcıdan test:**
- Developer Tools (F12) açın
- Network tab'ına gidin
- `https://edu.mutkukucuk.com/api/health` adresine gidin
- Response'u kontrol edin

### 5. Nginx Proxy Ayarlarını Kontrol Et

Nginx yapılandırmanızda `/api/` location bloğunun şöyle olması gerekiyor:

```nginx
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
    
    # CORS headers (optional, backend zaten yapıyor)
    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Handle preflight
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

### 6. Backend'i Yeniden Başlat
```bash
pm2 restart viducate-backend --update-env
pm2 logs viducate-backend
```

### 7. Nginx'i Yeniden Yükle
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Debug Adımları

### CORS Sorunu İçin:

1. **Browser Console'da kontrol:**
   - F12 → Console
   - CORS hatası görüyorsanız, hangi origin'in engellendiğini not edin

2. **Backend loglarında kontrol:**
   ```bash
   pm2 logs viducate-backend | grep -i "CORS blocked"
   ```
   
   Bu log size hangi origin'in engellendiğini gösterecek.

3. **Manuel test:**
   ```bash
   curl -H "Origin: https://edu.mutkukucuk.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        http://localhost:8080/api/auth/login \
        -v
   ```

### Health Endpoint Sorunu İçin:

1. **Backend direkt test:**
   ```bash
   curl http://localhost:8080/api/health
   ```
   
   Eğer bu çalışıyorsa, sorun Nginx'te.

2. **Nginx error log:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```
   
   Health endpoint'e istek yaparken hata var mı kontrol edin.

3. **Nginx access log:**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```
   
   İstekler geliyor mu kontrol edin.

## Beklenen Sonuç

- ✅ `curl http://localhost:8080/api/health` → `{"status":"OK",...}`
- ✅ `curl https://edu.mutkukucuk.com/api/health` → `{"status":"OK",...}`
- ✅ Tarayıcıdan login yapılabilmeli
- ✅ CORS hatası olmamalı

## Hala Sorun Varsa

1. **PM2 loglarını paylaşın:**
   ```bash
   pm2 logs viducate-backend --lines 100 > backend-logs.txt
   ```

2. **Nginx error log'unu paylaşın:**
   ```bash
   sudo tail -100 /var/log/nginx/error.log > nginx-errors.txt
   ```

3. **Backend .env dosyasını kontrol edin (sensitive bilgileri kaldırarak):**
   ```bash
   cat backend/.env | grep -v "SECRET\|PASSWORD\|KEY" > env-check.txt
   ```
