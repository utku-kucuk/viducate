# Video Upload Debug

## Sorun
Video upload 500 hatası veriyor ve backend loglarında "Video upload request:" mesajı görünmüyor.

## Debug Adımları

### 1. Backend Loglarını Detaylı İncele

```bash
pm2 logs viducate-backend --lines 0
```

Ardından video upload'u deneyin ve şunları arayın:
- "📤 Video upload endpoint called" - Endpoint çağrıldı mı?
- "📥 Multer processing completed" - Multer dosyayı işledi mi?
- "❌ Multer error" - Multer hatası var mı?
- "Video upload request:" - Request detayları
- "Video created successfully:" - Video oluşturuldu mu?

### 2. Request Size Kontrolü

Video dosyası çok büyük olabilir. Kontrol edin:

```bash
# Video dosya boyutunu kontrol et
ls -lh /path/to/video/file.mp4
```

MAX_FILE_SIZE environment variable'ını kontrol edin:
```bash
cat backend/.env | grep MAX_FILE_SIZE
```

### 3. Nginx Upload Size Limit

Nginx'te `client_max_body_size` kontrol edin:

```bash
sudo cat /etc/nginx/sites-available/edu.mutkukucuk.com | grep client_max_body_size
```

En az 5G olmalı.

### 4. Disk Alanı Kontrolü

```bash
df -h
```

### 5. Uploads Klasörü İzinleri

```bash
ls -la backend/uploads/videos/
```

Write permission olmalı.

### 6. Manuel Test

```bash
# Küçük bir test video ile
curl -X POST http://localhost:8080/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@/path/to/small-test-video.mp4" \
  -F "title=Test Video" \
  -F "courseId=COURSE_ID" \
  -v
```

## Olası Sorunlar

### Sorun 1: Request Timeout
**Belirti:** Request çok uzun sürüyor
**Çözüm:** Nginx timeout'larını artırın

### Sorun 2: File Size Limit
**Belirti:** Multer error: File too large
**Çözüm:** MAX_FILE_SIZE'ı artırın

### Sorun 3: Disk Full
**Belirti:** ENOENT veya write error
**Çözüm:** Disk alanını temizleyin

### Sorun 4: Permission Denied
**Belirti:** EACCES error
**Çözüm:** Uploads klasörü izinlerini düzeltin

## Beklenen Log Sırası

1. "📤 Video upload endpoint called"
2. "📥 Multer processing completed"
3. "File received: {...}"
4. "Video upload request: {...}"
5. "Video created successfully: {...}"

Eğer bu sırayı görmüyorsanız, hangi adımda takıldığını bulun.
