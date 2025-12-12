# Hızlı Login Düzeltme

## Sorun
HTTPS çalışıyor ama login yapılamıyor.

## Hemen Yapılacaklar

### 1. PM2'yi Yeniden Başlat (Environment Variables ile)

```bash
cd ~/viducate
git pull origin main
pm2 delete viducate-backend
pm2 start ecosystem.config.js
pm2 save
pm2 logs viducate-backend --lines 20
```

Health check'te `frontendUrl` artık "not set" yerine "https://edu.mutkukucuk.com" görünmeli.

### 2. Login Test

```bash
./test-login.sh
```

Veya manuel:

```bash
curl -X POST https://edu.mutkukucuk.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://edu.mutkukucuk.com" \
  -d '{"email":"teacher1@example.com","password":"teacher123"}' \
  -v
```

### 3. Kullanıcı Kontrolü

Eğer kullanıcı yoksa, test kullanıcısı oluşturun:

```bash
cd backend
node scripts/createTestUsers.js
```

### 4. CORS Loglarını Kontrol Et

```bash
pm2 logs viducate-backend --lines 0
```

Tarayıcıda login yapmayı deneyin. Loglarda CORS hatalarını göreceksiniz.

### 5. Browser Console Kontrolü

Tarayıcıda F12 → Console sekmesi → Login yapmayı deneyin ve hataları kontrol edin.

## Beklenen Sonuç

✅ Login başarılı olmalı ve token dönmeli
✅ Health check'te `frontendUrl` görünmeli
✅ CORS hatası olmamalı

## Sorun Devam Ederse

1. **Backend .env kontrolü:**
   ```bash
   cat backend/.env
   ```

2. **PM2 env kontrolü:**
   ```bash
   pm2 env 0 | grep FRONTEND_URL
   ```

3. **Backend logları:**
   ```bash
   pm2 logs viducate-backend --lines 100
   ```
