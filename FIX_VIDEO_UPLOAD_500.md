# Video Upload 500 Hatası Düzeltme

## Sorun
Video upload edilirken 500 (Internal Server Error) hatası alınıyor. Video oluşturulmuyor.

## Tespit Edilen Sorunlar

1. ❌ **Uploads klasörü relative path** - Klasör oluşturulmuyor veya yanlış yerde
2. ❌ **Error logging yetersiz** - Hata detayları görünmüyor
3. ⚠️ **CourseId validation eksik** - CourseId geçersiz olabilir

## Yapılan Düzeltmeler

1. ✅ **Absolute path kullanımı** - Uploads klasörü absolute path ile oluşturuluyor
2. ✅ **Klasör otomatik oluşturma** - ensureDirSync ile klasör oluşturuluyor
3. ✅ **Daha iyi error logging** - Stack trace ve request detayları loglanıyor
4. ✅ **CourseId validation** - CourseId geçerliliği kontrol ediliyor

## Şimdi Yapmanız Gerekenler

### 1. Kodu Güncelle:

```bash
cd ~/viducate
git pull origin main
```

### 2. Uploads Klasörlerini Oluştur:

```bash
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/thumbnails
mkdir -p backend/uploads/files
mkdir -p backend/uploads/profile-pictures
mkdir -p backend/uploads/chunks
chmod -R 755 backend/uploads
```

### 3. Backend'i Yeniden Başlat:

```bash
pm2 restart viducate-backend
pm2 logs viducate-backend --lines 50
```

### 4. Video Upload'u Test Et:

1. Kurs oluştur sayfasına gidin
2. Video yüklemeyi deneyin
3. Backend loglarını kontrol edin:
   ```bash
   pm2 logs viducate-backend --lines 100 | grep -i "video\|upload\|error"
   ```

### 5. Backend Loglarını İncele:

Loglarda şunları arayın:
- "Video upload request:" - Request detayları
- "Video created successfully:" - Video oluşturuldu mu?
- "Error uploading video:" - Hata detayları
- "Error stack:" - Stack trace

## Olası Sorunlar

### Sorun 1: Uploads Klasörü İzin Sorunu

**Çözüm:**
```bash
sudo chown -R $USER:$USER backend/uploads
chmod -R 755 backend/uploads
```

### Sorun 2: Disk Alanı Dolmuş

**Kontrol:**
```bash
df -h
```

### Sorun 3: Video Dosyası Çok Büyük

**Kontrol:** MAX_FILE_SIZE environment variable'ını kontrol edin:
```bash
cat backend/.env | grep MAX_FILE_SIZE
```

### Sorun 4: Database Constraint Hatası

**Kontrol:** Video model'inde required field'lar eksik olabilir

## Debug

### Backend Loglarını Detaylı İncele:

```bash
pm2 logs viducate-backend --lines 0
```

Ardından video upload'u deneyin ve logları izleyin.

### Manuel Video Upload Testi:

```bash
# Backend'de test
curl -X POST http://localhost:8080/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@/path/to/test-video.mp4" \
  -F "title=Test Video" \
  -F "courseId=COURSE_ID" \
  -v
```

## Beklenen Sonuçlar

✅ Video upload başarılı olmalı
✅ Video database'de oluşturulmalı
✅ Video ID dönmeli
✅ Video course'a link edilmeli

## Sorun Devam Ederse

1. **Backend loglarını paylaşın:**
   ```bash
   pm2 logs viducate-backend --lines 200 > video_upload_error.log
   ```

2. **Uploads klasörü izinlerini kontrol edin:**
   ```bash
   ls -la backend/uploads/
   ```

3. **Disk alanını kontrol edin:**
   ```bash
   df -h
   ```
