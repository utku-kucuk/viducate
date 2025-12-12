# Debug Adımları

## 1. Database Tablolarını Kontrol Et

```bash
cd ~/viducate/backend
node scripts/check-database.js
```

Bu script database'deki tüm tabloları ve kolonlarını gösterecek.

## 2. CORS Sorununu Debug Et

Backend loglarını canlı takip edin:

```bash
pm2 logs viducate-backend --lines 0
```

Ardından tarayıcıda `https://edu.mutkukucuk.com` adresine gidin ve login sayfasını açın. Loglarda CORS hatalarını ve hangi origin'in engellendiğini göreceksiniz.

## 3. Backend .env Dosyasını Kontrol Et

```bash
cat backend/.env | grep FRONTEND_URL
```

Şu satırı görmelisiniz:
```
FRONTEND_URL=https://edu.mutkukucuk.com
```

Eğer farklıysa, düzeltin:
```bash
nano backend/.env
```

## 4. Nginx Yapılandırmasını Kontrol Et

```bash
sudo cat /etc/nginx/sites-available/edu.mutkukucuk.com | grep -A 10 "location /api"
```

Şu şekilde görünmeli:
```nginx
location /api/ {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 5. Nginx Error Loglarını Kontrol Et

```bash
sudo tail -f /var/log/nginx/error.log
```

## 6. Backend Health Check'i Test Et

### Localhost'tan:
```bash
curl http://localhost:8080/api/health
```

### Nginx üzerinden:
```bash
curl https://edu.mutkukucuk.com/api/health
```

Her ikisi de JSON response döndürmeli.

## 7. CORS Preflight Request'i Test Et

```bash
curl -X OPTIONS https://edu.mutkukucuk.com/api/auth/login \
  -H "Origin: https://edu.mutkukucuk.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

Response'da `Access-Control-Allow-Origin` header'ını görmelisiniz.

## 8. PM2 Environment Variables'ı Kontrol Et

PM2'nin environment variables'ları doğru yüklediğinden emin olun:

```bash
pm2 env 0
```

`FRONTEND_URL` değişkenini görmelisiniz. Eğer yoksa:

```bash
pm2 restart viducate-backend --update-env
```

## 9. SSL/HTTPS Kontrolü

Eğer HTTPS kullanıyorsanız, Nginx'in SSL yapılandırması doğru olmalı. HTTP'den HTTPS'e yönlendirme yapılıyor mu kontrol edin:

```bash
sudo cat /etc/nginx/sites-available/edu.mutkukucuk.com | head -20
```

## 10. Port Kontrolü

Backend'in 8080 portunda çalıştığını doğrulayın:

```bash
lsof -i :8080
netstat -tlnp | grep 8080
```

## Hızlı Çözüm

Eğer hala CORS hatası alıyorsanız, geçici olarak tüm origin'lere izin verebilirsiniz (sadece test için):

`backend/src/server.js` dosyasında CORS yapılandırmasını geçici olarak şu şekilde değiştirin:

```javascript
app.use(cors({
  origin: true, // Tüm origin'lere izin ver (SADECE TEST İÇİN!)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));
```

Eğer bu çalışırsa, sorun CORS yapılandırmasında. Eğer çalışmazsa, sorun başka bir yerde.
