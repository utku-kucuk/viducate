# Acil Düzeltme - CORS ve Nginx Sorunları

## Sorunlar
1. ❌ CORS hatası devam ediyor
2. ❌ `/api/health` endpoint'i tarayıcıda görünmüyor
3. ⚠️ Database tablo isimleri bulunamıyor

## Hemen Yapılacaklar

### 1. Backend .env Dosyasını Kontrol Et

```bash
cd ~/viducate
cat backend/.env | grep FRONTEND_URL
```

Eğer `FRONTEND_URL=https://edu.mutkukucuk.com` görünmüyorsa:

```bash
nano backend/.env
```

Şu satırı ekleyin veya düzeltin:
```env
FRONTEND_URL=https://edu.mutkukucuk.com
```

### 2. PM2'yi Environment Variables ile Yeniden Başlat

```bash
pm2 restart viducate-backend --update-env
pm2 logs viducate-backend --lines 30
```

### 3. Nginx Yapılandırmasını Kontrol Et

```bash
sudo cat /etc/nginx/sites-available/edu.mutkukucuk.com
```

**ÖNEMLİ:** `/api/` location bloğu şu şekilde olmalı:

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
}
```

**DİKKAT:** `proxy_pass` satırında sonunda `/` OLMAMALI! `http://localhost:8080` şeklinde olmalı, `http://localhost:8080/` değil.

### 4. Nginx'i Test Et ve Yeniden Yükle

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Test Scriptlerini Çalıştır

```bash
# Connection test
./test-connection.sh

# Database tablolarını kontrol et
cd backend
node scripts/check-database.js
cd ..
```

### 6. CORS Loglarını İncele

```bash
pm2 logs viducate-backend --lines 0
```

Ardından tarayıcıda `https://edu.mutkukucuk.com` adresine gidin. Loglarda şunları göreceksiniz:
- Hangi origin engellendi
- Hangi origin'lere izin verildi
- FRONTEND_URL değeri

### 7. Tarayıcı Console'unu Kontrol Et

Tarayıcıda F12'ye basın, Console sekmesine gidin ve şu hataları arayın:
- CORS hatası
- Network hataları
- 500 hatası

### 8. Geçici CORS Çözümü (Sadece Test İçin)

Eğer hala CORS hatası alıyorsanız, geçici olarak tüm origin'lere izin verebilirsiniz:

```bash
nano backend/src/server.js
```

CORS yapılandırmasını bulun (yaklaşık 35. satır) ve şu şekilde değiştirin:

```javascript
// GEÇİCİ: Tüm origin'lere izin ver (SADECE TEST İÇİN!)
app.use(cors({
  origin: true, // Tüm origin'lere izin ver
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));
```

Ardından:
```bash
pm2 restart viducate-backend
```

Eğer bu çalışırsa, sorun CORS yapılandırmasında. Orijinal CORS koduna geri dönüp FRONTEND_URL'i kontrol edin.

## Beklenen Sonuçlar

### ✅ Başarılı Test Sonuçları:

1. **Localhost test:**
   ```bash
   curl http://localhost:8080/api/health
   ```
   Şu response'u görmelisiniz:
   ```json
   {"status":"OK","message":"Viducate API is running","timestamp":"...","environment":"production","port":"8080","frontendUrl":"https://edu.mutkukucuk.com"}
   ```

2. **Nginx test:**
   ```bash
   curl https://edu.mutkukucuk.com/api/health
   ```
   Aynı JSON response'u görmelisiniz.

3. **Tarayıcı test:**
   `https://edu.mutkukucuk.com/api/health` adresine gittiğinizde JSON response görmelisiniz.

## Sorun Devam Ederse

1. **Nginx error log:**
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

2. **Nginx access log:**
   ```bash
   sudo tail -50 /var/log/nginx/access.log
   ```

3. **PM2 logs:**
   ```bash
   pm2 logs viducate-backend --lines 100
   ```

4. **Port kontrolü:**
   ```bash
   netstat -tlnp | grep 8080
   lsof -i :8080
   ```

5. **SSL sertifikası kontrolü:**
   ```bash
   sudo certbot certificates
   ```

## Önemli Notlar

- Backend 8080 portunda çalışıyor (sadece localhost'tan erişilebilir)
- Nginx 80/443 portlarında çalışıyor ve backend'e proxy yapıyor
- CORS için FRONTEND_URL environment variable'ı doğru ayarlanmalı
- PM2 restart yaparken `--update-env` flag'i kullanın
