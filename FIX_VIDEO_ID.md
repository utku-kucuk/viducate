# Video ID "unknown" Sorunu Düzeltme

## Sorun
Video sayfası açılırken video ID "unknown" olarak gönderiliyor ve 404 hatası alınıyor.

## Tespit Edilen Sorun

1. ❌ **Video ID bulunamıyor** - CourseDetail'de video ID resolve edilemiyor
2. ❌ **Fallback "unknown" kullanılıyor** - ID bulunamazsa "unknown" gönderiliyor
3. ❌ **Video object'inde ID yok** - Chapter/section yapısında video ID'leri eksik

## Yapılan Düzeltmeler

1. ✅ **"unknown" kullanımı kaldırıldı** - Artık "unknown" gönderilmiyor
2. ✅ **Daha agresif ID arama** - video.videoId gibi alternatif alanlar da kontrol ediliyor
3. ✅ **Better error handling** - ID bulunamazsa kullanıcıya açıklayıcı mesaj gösteriliyor
4. ✅ **Progress ID lookup iyileştirildi** - video.videoId de kontrol ediliyor

## Kontrol Adımları

### 1. Browser Console'da Kontrol

Video'ya tıkladığınızda console'da şunları görmelisiniz:
- "🔍 Video ID not found, trying aggressive search..."
- "✅ Found ID in..." mesajları
- "🚀 Final Video ID:" mesajı

Eğer "❌ All attempts to find video ID failed" görüyorsanız, video ID gerçekten bulunamıyor.

### 2. Video Object'i Kontrol Et

Browser console'da:

```javascript
// CourseDetail sayfasında
console.log('Video object:', video);
console.log('Video ID:', video.id);
console.log('Video videoId:', video.videoId);
console.log('Course videos:', course.videos);
```

### 3. Backend API Response'u Kontrol Et

```bash
# Backend'de course data'yı kontrol et
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://edu.mutkukucuk.com/api/courses/COURSE_ID
```

Response'da `chapters` array'inde video'ların `id` field'ı var mı kontrol edin.

### 4. Database'de Video ID Kontrolü

```bash
cd backend
node -e "
const { Course, Video } = require('./src/models');
(async () => {
  const course = await Course.findOne({
    include: [{ model: Video, as: 'videos' }]
  });
  console.log('Course videos:', course.videos.map(v => ({ id: v.id, title: v.title })));
  console.log('Course chapters:', JSON.parse(course.chapters || '[]'));
  process.exit(0);
})();
"
```

## Olası Sorunlar ve Çözümleri

### Sorun 1: Video ID Chapter Yapısında Yok

**Belirti:** Video object'inde `id` field'ı yok
**Çözüm:** Video oluşturulurken chapter yapısına ID eklenmeli

### Sorun 2: Video Backend'de Kayıtlı Değil

**Belirti:** `course.videos` array'inde video yok
**Çözüm:** Video'yu course'a link etmek gerekiyor

### Sorun 3: Video ID Formatı Yanlış

**Belirti:** ID var ama format yanlış (string vs number)
**Çözüm:** ID'leri string'e çevirerek karşılaştırma yapılıyor

## Geçici Çözüm

Eğer video ID hala bulunamıyorsa:

1. **Kursu yeniden oluşturun** - Video'ları course'a doğru şekilde link edin
2. **Video'yu manuel olarak course'a ekleyin** - Backend'de video'nun `courseId` field'ını güncelleyin
3. **Sayfayı yenileyin** - Bazen cache sorunu olabilir

## Sorun Devam Ederse

1. **Browser console log'larını paylaşın**
2. **Network tab'ında API response'u paylaşın**
3. **Video object'ini paylaşın** (console.log output)
