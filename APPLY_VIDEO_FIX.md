# Video Upload Düzeltmesi - Uygulama Adımları

## Yapılan Düzeltmeler

1. ✅ **Backend**: Express.json() middleware'i upload route'larında atlanıyor (multipart çakışması önleniyor)
2. ✅ **Frontend**: Content-Type header'ı kaldırıldı (Axios otomatik boundary ekler)

## Uygulama Adımları

### 1. Kodu Güncelle:

```bash
cd ~/viducate
git pull origin main
```

### 2. Backend'i Yeniden Başlat:

```bash
pm2 restart viducate-backend --update-env
```

### 3. Frontend'i Rebuild Et (Production'da ise):

```bash
cd ~/viducate/frontend
npm run build
```

### 4. Backend Loglarını Canlı İzle:

```bash
pm2 logs viducate-backend --lines 0
```

### 5. Video Upload'u Test Et:

1. Tarayıcıda kurs oluştur sayfasına gidin
2. Video yüklemeyi deneyin
3. Backend loglarını izleyin

**Beklenen log sırası:**
1. `📤 Video upload endpoint called` - ✅ Endpoint çağrıldı
2. `Request headers: {...}` - ✅ Headers görünüyor
3. `📥 Multer processing completed` - ✅ Multer dosyayı işledi
4. `File received: {...}` - ✅ Dosya alındı
5. `Video upload request: {...}` - ✅ Request detayları
6. `Video created successfully: {...}` - ✅ Video oluşturuldu

### 6. Eğer Hala Sorun Varsa:

**Browser Console'u kontrol edin:**
- Network tab'de `/api/videos/upload` request'ini bulun
- Request headers'ı kontrol edin
- Response'u kontrol edin

**Backend loglarını paylaşın:**
```bash
pm2 logs viducate-backend --lines 200 > video_upload_debug.log
cat video_upload_debug.log
```

## Önemli Notlar

- **Content-Type header'ı**: Axios FormData kullanırken otomatik olarak `multipart/form-data; boundary=...` ekler. Manuel olarak sadece `multipart/form-data` yazmak boundary'yi kaldırır ve sorun yaratır.
- **Express.json()**: Multipart request'lerde body parser kullanılmamalı, çünkü multer kendi parsing'ini yapar.
- **Nginx**: `client_max_body_size 5G` zaten var, sorun yok.

## Sorun Devam Ederse

1. Küçük bir test dosyası (10MB) ile deneyin
2. Browser Network tab'de request detaylarını kontrol edin
3. Backend loglarını paylaşın

