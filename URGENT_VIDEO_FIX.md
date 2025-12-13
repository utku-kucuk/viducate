# Acil Video Upload Sorunu

## Sorun
Video upload 500 hatası veriyor ve endpoint hiç çağrılmıyor (loglarda "📤 Video upload endpoint called" yok).

## Olası Nedenler

1. ❌ **Express.json() multipart ile çakışıyor** - Body parser multipart request'i parse etmeye çalışıyor
2. ❌ **Multer error yakalanmıyor** - Multer hata veriyor ama log görünmüyor
3. ❌ **Request timeout** - Dosya çok büyük, request timeout oluyor
4. ❌ **Nginx size limit** - Nginx dosya boyutu limiti aşılıyor

## Yapılan Düzeltmeler

1. ✅ **Express.json() skip** - Upload route'larında body parser atlanıyor
2. ✅ **Multer error handling** - Multer hataları yakalanıyor
3. ✅ **Request logging** - Her adımda detaylı log

## Şimdi Yapmanız Gerekenler

### 1. Kodu Güncelle:

```bash
cd ~/viducate
git pull origin main
```

### 2. Backend'i Yeniden Başlat:

```bash
pm2 restart viducate-backend
```

### 3. Backend Loglarını Canlı İzle:

```bash
pm2 logs viducate-backend --lines 0
```

### 4. Video Upload'u Deneyin:

1. Kurs oluştur sayfasına gidin
2. Video yüklemeyi deneyin
3. Logları izleyin

**Beklenen log sırası:**
1. "📤 Video upload endpoint called" - Endpoint çağrıldı mı?
2. "📥 Multer processing completed" - Multer dosyayı işledi mi?
3. "File received: {...}" - Dosya alındı mı?
4. "Video upload request: {...}" - Request detayları
5. "Video created successfully: {...}" - Video oluşturuldu mu?

### 5. Eğer Hala Log Görünmüyorsa:

**Nginx size limit kontrolü:**
```bash
sudo cat /etc/nginx/sites-available/edu.mutkukucuk.com | grep client_max_body_size
```

En az 5G olmalı:
```nginx
client_max_body_size 5G;
```

**Nginx'i yeniden yükle:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Request Timeout Kontrolü:

Nginx'te timeout ayarları:
```nginx
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
```

## Alternatif Test

Eğer hala çalışmıyorsa, küçük bir test dosyası ile deneyin:

1. Küçük bir video dosyası (örn: 10MB) yükleyin
2. Çalışıyorsa, sorun dosya boyutu
3. Çalışmıyorsa, sorun başka bir yerde

## Sorun Devam Ederse

Backend loglarını paylaşın:
```bash
pm2 logs viducate-backend --lines 200 > video_upload_debug.log
```

Özellikle şunları arayın:
- "📤 Video upload endpoint called"
- "❌ Multer error"
- "Error uploading video"
- Herhangi bir error mesajı
