# Kurs Oluşturma 500 Hatası Düzeltme

## Sorun
Kurs oluştururken 500 (Internal Server Error) hatası alınıyor.

## Yapılan Düzeltmeler

1. ✅ **Chapters validation** - Chapters array olarak doğru formatlanıyor
2. ✅ **Error logging** - Daha detaylı error logging eklendi
3. ✅ **Level default** - Level belirtilmezse 'beginner' default değeri

## Kontrol Adımları

### 1. Backend Loglarını Kontrol Et

Sunucuda:

```bash
pm2 logs viducate-backend --lines 100
```

Hata mesajını arayın:
- "Error creating course:"
- "Error stack:"
- "Request body:"

### 2. Database Constraint Kontrolü

```bash
cd backend
node -e "
const { Course } = require('./src/models');
const { sequelize } = require('./src/config/database');
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Test course creation
    const testCourse = await Course.create({
      title: 'Test Course',
      description: 'Test description for debugging',
      category: 'test',
      level: 'beginner',
      teacherId: 'test-id',
      chapters: []
    });
    console.log('✅ Test course created:', testCourse.id);
    await testCourse.destroy();
    console.log('✅ Test course deleted');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }
})();
"
```

### 3. Validation Kontrolü

Frontend'den gönderilen data'yı kontrol edin:

```javascript
// Browser console'da
// Network tab → Request payload'ı kontrol edin
```

Şunları kontrol edin:
- `title` var mı ve 3-100 karakter arası mı?
- `description` var mı ve 10-500 karakter arası mı?
- `level` 'beginner', 'intermediate', veya 'advanced' mı?
- `chapters` array formatında mı?

### 4. Common Sorunlar

#### Sorun 1: Validation Hatası
**Belirti:** 400 Bad Request
**Çözüm:** Frontend'den gönderilen data'yı kontrol edin

#### Sorun 2: Database Constraint
**Belirti:** Sequelize validation error
**Çözüm:** Database schema'yı kontrol edin

#### Sorun 3: Chapters Format
**Belirti:** JSON parse error
**Çözüm:** Chapters array olarak gönderildiğinden emin olun

#### Sorun 4: Teacher ID
**Belirti:** Foreign key constraint
**Çözüm:** req.user.id'nin geçerli bir user ID'si olduğundan emin olun

## Test

### Manuel Test

```bash
# Backend'de test endpoint'i
curl -X POST http://localhost:8080/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Course",
    "description": "This is a test course description",
    "level": "beginner",
    "chapters": []
  }'
```

### Frontend Test

1. Browser console'u açın (F12)
2. Network tab'ını açın
3. Kurs oluşturmayı deneyin
4. Request ve Response'u kontrol edin

## Sorun Devam Ederse

1. **Backend loglarını paylaşın:**
   ```bash
   pm2 logs viducate-backend --lines 100 > course_error.log
   ```

2. **Request payload'ı paylaşın:**
   - Browser Network tab → Request payload

3. **Database schema'yı kontrol edin:**
   ```bash
   cd backend
   node scripts/check-database.js
   ```
