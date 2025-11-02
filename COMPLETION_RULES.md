# Video Completion (Tamamlanma) Kuralları - Kritik Referans

**ÖNEMLİ: Bu kurallar değiştirilmemeli ve tüm kod değişikliklerinde bu kurallar takip edilmelidir.**

## Temel Completion Şartı

Video, **izlenen sürenin toplam video süresine oranı >= %90** olduğunda completed sayılır.

## Mevcut Sistem Mimarisi

### 1. Backend Model (Progress.js) - beforeSave Hook
- **Konum:** `backend/src/models/Progress.js` - Line 151-166
- **Mantık:** `checkSmartCompletion()` fonksiyonu `watchedSegments` array'inden toplam izlenen süreyi hesaplar
- **Formül:** `(watchedSegments toplam süresi / totalDuration) * 100 >= 90%`
- **Durum:** Her `progress.save()` çağrıldığında otomatik çalışır
- **Önemli:** Eğer `isCompleted` zaten `true` ise tekrar set edilmez (idempotent)

### 2. Backend Controller (progressController.js) - updateProgress
- **Konum:** `backend/src/controllers/progressController.js` - Line 190-203
- **Mantık:** `calculatedWatchPercentage >= 90%` kontrol eder
- **Durum:** Sadece `!wasCompleted` durumunda `isCompleted = true` yapar
- **Önemli:** Bir kez completed olduktan sonra, ilerleme geri düşse bile tekrar completed yapılmaz

### 3. Frontend VideoPlayer.js - Local State
- **Konum:** `frontend/src/pages/VideoPlayer.js`
- **Local Completion Check (Line 347-352):** `progressPercentage >= 90%` olduğunda `setIsCompleted(true)` ve `saveProgress()` çağırır
- **Progress Yükleme (Line 224):** `Boolean(progress.isCompleted) || pct >= 90` - Server'dan `isCompleted` VEYA local `pct >= 90` ise completed
- **saveProgress Sonrası (Line 283):** `serverCompleted || serverPct >= 90` - Server'ın `isCompleted` VEYA `watchPercentage >= 90` ise completed

### 4. Frontend CourseSidebar.js - Video Status
- **Konum:** `frontend/src/components/CourseSidebar.js` - Line 173-174
- **Mantık:** `progress.isCompleted === true` VEYA `progress.watchPercentage >= 90` ise 'completed' döner

## Mevcut Sorunlar ve Çelişkiler

1. **Çift Kontrol Problemi:** 
   - Model hook'unda `watchedSegments` üzerinden hesaplama yapılıyor
   - Controller'da `calculatedWatchPercentage` üzerinden hesaplama yapılıyor
   - İkisi farklı değerler üretebilir

2. **Frontend Fallback Problemi:**
   - Frontend'de `|| pct >= 90` fallback'i var
   - Bu, server `isCompleted = false` dese bile frontend'in kendi completion'ını yapmasına neden oluyor
   - Sidebar ve VideoPlayer arasında tutarsızlık yaratabilir

3. **Sidebar vs VideoPlayer Tutarsızlığı:**
   - Sidebar: `progress.isCompleted || watchPercentage >= 90` kontrolü yapıyor
   - VideoPlayer: Server'ın `isCompleted` değerini güveniyor ama local fallback de var
   - Kullanıcı %90 izledikten sonra çıkıp tekrar girdiğinde, sidebar completed gösterirken video player "not completed" gösterebilir

## Kritik Kurallar - ASLA DEĞİŞTİRME

1. **Completion Threshold: %90** - Bu değer sabit kalmalı
2. **Server isCompleted Flag'i Tek Gerçek Kaynak Olmalı:**
   - Frontend asla server'ın `isCompleted` değerini görmezden gelmemeli
   - Frontend'deki `|| pct >= 90` fallback'leri kaldırılmalı
   - Sidebar ve VideoPlayer her zaman server'ın `isCompleted` değerini kullanmalı

3. **WatchedSegments Hesaplama Yöntemi:**
   - `watchedSegments` array'i merge edilmiş (overlapping segmentler birleştirilmiş) olmalı
   - Toplam izlenen süre: `watchedSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)`
   - Yüzde: `(totalWatchedTime / totalDuration) * 100`

4. **Completion İşaretleme Kuralları:**
   - Bir kez `isCompleted = true` yapıldıktan sonra, ilerleme geri düşse bile tekrar `false` yapılmamalı
   - Completion sadece `watchPercentage >= 90%` olduğunda ve henüz completed değilse yapılmalı

5. **Progress Kaydetme Sıklığı:**
   - Şu anda her 3 saniyede bir kaydediliyor
   - Pause olduğunda anında kaydedilmeli
   - Video bittiğinde anında kaydedilmeli

## Önerilen Düzeltmeler (Gelecekte Yapılacak)

1. **Single Source of Truth:** Server'ın `isCompleted` değeri tek gerçek kaynak olmalı
2. **Frontend Fallback Kaldırılmalı:** Tüm `|| pct >= 90` kontrolleri kaldırılmalı
3. **Sidebar Tutarlılığı:** Sidebar sadece `progress.isCompleted` kontrolü yapmalı
4. **Model Hook Güncellenmeli:** `checkSmartCompletion` fonksiyonu `watchedSegments` yerine `watchPercentage` kullanmalı (veya tersi - tek bir yöntem seçilmeli)

---

**Son Güncelleme:** 2024-01-XX
**Not:** Bu dosya sistemin video completion mantığının doğru anlaşılması için kritik referans dokümantasyondur.

