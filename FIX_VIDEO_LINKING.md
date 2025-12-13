# Video-Course Linking Sorunu Düzeltme

## Sorun
Video upload edildi ama course'a link edilmedi. Video object'inde ID yok ve course.videos array'i boş.

## Tespit Edilen Sorunlar

1. ❌ **Video ID chapter yapısında yok** - Video upload edildikten sonra ID chapter'a eklenmiyor
2. ❌ **course.videos boş** - Video'lar course'a link edilmiş ama getCourseById'de bulunamıyor
3. ❌ **Title matching çalışmıyor** - Video title ile eşleştirme yapılamıyor

## Yapılan Düzeltmeler

### 1. Frontend (CreateCourse.js)

1. ✅ **Video upload sonrası chapter güncelleme** - Video ID'leri chapter yapısına ekleniyor
2. ✅ **Promise.allSettled kullanımı** - Tüm upload'lar tamamlandıktan sonra güncelleme
3. ✅ **Title matching** - Video title ile chapter'daki video eşleştiriliyor

### 2. Backend (courseController.js)

1. ✅ **Course videos fetch** - Course'a ait tüm video'lar çekiliyor
2. ✅ **Title-based matching** - Chapter'daki video'lar title ile eşleştiriliyor
3. ✅ **ID injection** - Eşleşen video'ların ID'leri chapter'a ekleniyor
4. ✅ **Fallback matching** - ID yoksa title ile eşleştirme yapılıyor

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

### 3. Frontend'i Build Et:

```bash
cd frontend
npm run build
cd ..
```

### 4. Mevcut Kursu Düzelt:

Eğer zaten bir kurs oluşturduysanız, kursu düzenleyip kaydedin. Bu, video ID'lerini chapter yapısına ekleyecektir.

Veya manuel olarak:

```bash
cd backend
node -e "
const { Course, Video } = require('./src/models');
(async () => {
  const course = await Course.findOne();
  const videos = await Video.findAll({ where: { courseId: course.id } });
  console.log('Course videos:', videos.map(v => ({ id: v.id, title: v.title })));
  
  // Update chapters with video IDs
  let chapters = JSON.parse(course.chapters || '[]');
  chapters.forEach(chapter => {
    chapter.sections?.forEach(section => {
      section.videos?.forEach(video => {
        if (!video.id && video.title) {
          const matched = videos.find(v => v.title === video.title);
          if (matched) {
            video.id = matched.id;
            console.log('✅ Matched:', video.title, '->', matched.id);
          }
        }
      });
    });
  });
  
  await course.update({ chapters: JSON.stringify(chapters) });
  console.log('✅ Course chapters updated');
  process.exit(0);
})();
"
```

### 5. Yeni Kurs Oluştur:

1. Yeni bir kurs oluşturun
2. Video yükleyin
3. Kursu kaydedin
4. Video ID'leri otomatik olarak chapter yapısına eklenecek

## Test

1. Kurs detay sayfasına gidin
2. Browser console'u açın (F12)
3. Start butonuna tıklayın
4. Console'da şunları görmelisiniz:
   - "✅ Matched video by title" mesajları
   - Video ID'lerin bulunduğu
   - Navigate işleminin başarılı olduğu

## Beklenen Sonuçlar

✅ Video ID'leri chapter yapısında olmalı
✅ course.videos array'i dolu olmalı
✅ Video sayfası açılmalı
✅ "unknown" gönderilmemeli

## Sorun Devam Ederse

1. **Backend loglarını kontrol edin:**
   ```bash
   pm2 logs viducate-backend --lines 100 | grep -i video
   ```

2. **Database'de video'ları kontrol edin:**
   ```bash
   cd backend
   node scripts/check-database.js
   ```

3. **Course API response'unu kontrol edin:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     https://edu.mutkukucuk.com/api/courses/COURSE_ID
   ```
