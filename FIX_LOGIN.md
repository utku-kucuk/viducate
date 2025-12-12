# Login Sorunu Düzeltme

## Sorun
HTTPS çalışıyor, site açılıyor ama login yapılamıyor.

## Tespit Edilen Sorunlar

1. ⚠️ **Environment Variables yüklenmiyor** - `frontendUrl: "not set"` görünüyor
2. ❌ **CORS sorunu olabilir** - Frontend'den gelen istekler engellenebilir
3. ⚠️ **Kullanıcı veritabanında olmayabilir** veya şifre yanlış

## Çözüm Adımları

### 1. PM2'yi Environment Variables ile Yeniden Başlat

```bash
cd ~/viducate
git pull origin main
pm2 delete viducate-backend
pm2 start ecosystem.config.js --update-env
pm2 save
pm2 logs viducate-backend --lines 20
```

Health check'te artık `frontendUrl` görünmeli:
```bash
curl https://edu.mutkukucuk.com/api/health
```

### 2. Backend .env Dosyasını Kontrol Et

```bash
cat backend/.env | grep -E "FRONTEND_URL|JWT_SECRET"
```

Şu satırları görmelisiniz:
```env
FRONTEND_URL=https://edu.mutkukucuk.com
JWT_SECRET=your-secret-key-here
```

### 3. Login Test Scriptini Çalıştır

```bash
./test-login.sh
```

Bu script:
- Health endpoint'i test eder
- Login endpoint'ini test eder
- CORS headers'ı kontrol eder
- Backend loglarını gösterir

### 4. Kullanıcı Kontrolü

Veritabanında `teacher1` kullanıcısının olup olmadığını kontrol edin:

```bash
cd backend
node -e "
const { User } = require('./src/models');
(async () => {
  try {
    const user = await User.findOne({ where: { email: 'teacher1@example.com' } });
    if (user) {
      console.log('✅ User found:');
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Active:', user.isActive);
    } else {
      console.log('❌ User not found');
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
"
```

### 5. Test Kullanıcısı Oluştur (Eğer Yoksa)

```bash
cd backend
node scripts/createTestUsers.js
```

Veya manuel olarak:

```bash
cd backend
node -e "
const { User } = require('./src/models');
const bcrypt = require('bcryptjs');
(async () => {
  try {
    const hashedPassword = await bcrypt.hash('teacher123', 12);
    const user = await User.create({
      email: 'teacher1@example.com',
      password: hashedPassword,
      firstName: 'Teacher',
      lastName: 'One',
      role: 'teacher',
      isActive: true,
      isEmailVerified: true
    });
    console.log('✅ User created:', user.email);
    process.exit(0);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      console.log('⚠️  User already exists');
    } else {
      console.error('Error:', e);
    }
    process.exit(1);
  }
})();
"
```

### 6. CORS Loglarını İncele

```bash
pm2 logs viducate-backend --lines 0
```

Ardından tarayıcıda login sayfasına gidin ve login yapmayı deneyin. Loglarda şunları göreceksiniz:
- Hangi origin engellendi
- Hangi origin'lere izin verildi
- Login isteği geldi mi

### 7. Tarayıcı Console'unu Kontrol Et

Tarayıcıda F12'ye basın, Console ve Network sekmelerine bakın:
- **Console:** CORS hatası var mı?
- **Network:** Login isteği gönderildi mi? Response ne?

### 8. Manuel Login Testi

```bash
# Login testi
curl -X POST https://edu.mutkukucuk.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://edu.mutkukucuk.com" \
  -d '{"email":"teacher1@example.com","password":"teacher123"}' \
  -v
```

Başarılı response şu şekilde olmalı:
```json
{
  "message": "Login successful",
  "user": {...},
  "token": "..."
}
```

## Beklenen Sonuçlar

✅ Health check'te `frontendUrl: "https://edu.mutkukucuk.com"` görünmeli
✅ Login endpoint'i çalışmalı
✅ CORS headers mevcut olmalı
✅ Login başarılı olmalı ve token dönmeli

## Sorun Devam Ederse

1. **PM2 logs:**
   ```bash
   pm2 logs viducate-backend --lines 100
   ```

2. **Nginx error log:**
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

3. **Backend .env kontrolü:**
   ```bash
   cat backend/.env
   ```

4. **Database kullanıcı kontrolü:**
   ```bash
   cd backend
   node scripts/check-database.js
   ```

## Önemli Notlar

- PM2 restart yaparken `--update-env` flag'i kullanın
- `ecosystem.config.js` dosyası `.env` dosyasını otomatik yükler
- CORS için `FRONTEND_URL` environment variable'ı doğru ayarlanmalı
- Kullanıcı veritabanında olmalı ve `isActive: true` olmalı
