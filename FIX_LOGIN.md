# Login Sorunu Düzeltme

## Sorun
HTTPS çalışıyor, site açılıyor ama login yapılamıyor.

## Olası Nedenler

1. **PM2 environment variables yüklenmiyor** - `frontendUrl` "not set" görünüyor
2. **CORS sorunu** - Login request'i engelleniyor olabilir
3. **Kullanıcı yok veya şifre yanlış**
4. **Database bağlantı sorunu**

## Hemen Yapılacaklar

### 1. PM2 Ecosystem Config'i Düzelt

`ecosystem.config.js` dosyasını güncelledik. Şimdi PM2'yi yeniden başlatın:

```bash
cd ~/viducate
pm2 delete viducate-backend
pm2 start ecosystem.config.js --update-env
pm2 save
```

### 2. Backend .env Dosyasını Kontrol Et

```bash
cat backend/.env | grep -E "FRONTEND_URL|JWT_SECRET|NODE_ENV"
```

Şu değerleri görmelisiniz:
```
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://edu.mutkukucuk.com
JWT_SECRET=your-secret-key
```

### 3. PM2 Environment Variables'ı Kontrol Et

```bash
pm2 env 0
```

`FRONTEND_URL` değişkenini görmelisiniz. Eğer yoksa:

```bash
# .env dosyasını manuel yükle
pm2 restart viducate-backend --update-env
pm2 logs viducate-backend --lines 20
```

### 4. Login Test

```bash
# Test scriptini çalıştır
chmod +x test-login.sh
./test-login.sh
```

Veya manuel test:

```bash
curl -X POST https://edu.mutkukucuk.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://edu.mutkukucuk.com" \
  -d '{"email":"teacher1@example.com","password":"teacher123"}'
```

### 5. Kullanıcı Kontrolü

Database'de kullanıcı var mı kontrol edin:

```bash
cd backend
node -e "
const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');
(async () => {
  await sequelize.authenticate();
  const users = await User.findAll({ attributes: ['id', 'email', 'role', 'isActive'] });
  console.log('Kullanıcılar:');
  users.forEach(u => console.log(\`  - \${u.email} (\${u.role}) - Active: \${u.isActive}\`));
  await sequelize.close();
})();
"
```

### 6. CORS Loglarını Kontrol Et

```bash
pm2 logs viducate-backend --lines 0
```

Ardından tarayıcıda login sayfasını açın. Loglarda CORS hatalarını göreceksiniz.

### 7. Backend Loglarını Kontrol Et

```bash
pm2 logs viducate-backend --lines 50 | grep -i "login\|cors\|error"
```

## Beklenen Sonuçlar

### ✅ Başarılı Login Response:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "teacher1@example.com",
    "role": "teacher",
    ...
  }
}
```

### ❌ Hatalı Login Response:

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

## Sorun Devam Ederse

### 1. Test Kullanıcısı Oluştur

```bash
cd backend
node scripts/createTestUsers.js
```

### 2. Şifre Hash Kontrolü

Eğer kullanıcı varsa ama login yapamıyorsanız, şifre hash'i kontrol edin:

```bash
cd backend
node -e "
const bcrypt = require('bcrypt');
const password = 'teacher123';
bcrypt.hash(password, 12).then(hash => {
  console.log('Hash:', hash);
});
"
```

### 3. JWT Secret Kontrolü

```bash
cat backend/.env | grep JWT_SECRET
```

Eğer varsayılan değerdeyse (`your-secret-key-jwt-key-here-change-this`), değiştirin:

```bash
nano backend/.env
# JWT_SECRET'i güçlü bir değerle değiştirin
```

### 4. Browser Console Kontrolü

Tarayıcıda F12'ye basın, Console sekmesine gidin ve login yapmayı deneyin. Hataları kontrol edin:
- CORS hatası
- 401 Unauthorized
- 500 Internal Server Error
- Network errors

## Hızlı Çözüm

Eğer hala sorun varsa, geçici olarak CORS'u tüm origin'lere açın (sadece test için):

`backend/src/server.js` dosyasında:

```javascript
app.use(cors({
  origin: true, // Tüm origin'lere izin ver (SADECE TEST İÇİN!)
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
