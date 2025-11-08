# FFmpeg Kurulumu - Otomatik Çözünürlük Dönüşümü

Video yükleme sisteminde otomatik çözünürlük dönüşümü için FFmpeg kurulu olmalıdır.

## macOS Kurulumu

```bash
brew install ffmpeg
```

## Linux Kurulumu

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### CentOS/RHEL
```bash
sudo yum install ffmpeg
# veya
sudo dnf install ffmpeg
```

## Windows Kurulumu

1. FFmpeg'i [ffmpeg.org](https://ffmpeg.org/download.html) adresinden indirin
2. ZIP dosyasını açın ve `ffmpeg.exe` dosyasını PATH'e ekleyin
3. Veya Chocolatey ile: `choco install ffmpeg`

## Kurulum Kontrolü

Kurulumdan sonra kontrol etmek için:

```bash
ffmpeg -version
```

## Nasıl Çalışıyor?

1. Video yüklendiğinde sistem otomatik olarak şu çözünürlükleri oluşturur:
   - **360p** - Düşük kalite (yavaş internet için)
   - **480p** - Orta-düşük kalite
   - **720p** - HD kalite (varsayılan)
   - **1080p** - Full HD kalite (en yüksek)

2. Sistem kaynak videonun çözünürlüğünü kontrol eder ve sadece kaynak çözünürlükten küçük veya eşit çözünürlükler oluşturur (upscaling yapılmaz).

3. Kullanıcılar VideoPlayer'da çözünürlük seçici ile istediği çözünürlüğü seçebilir.

## FFmpeg Yoksa Ne Olur?

FFmpeg kurulu değilse:
- Sistem orijinal videoyu olduğu gibi kaydeder
- Sadece tek bir çözünürlük (720p) olarak işaretlenir
- Console'da uyarı mesajı görünür
- Video yine çalışır, sadece çözünürlük seçeneği olmaz

## Notlar

- Video işleme uzun sürebilir (özellikle büyük videolar için)
- İşlem sırasında sunucu yanıt vermeye devam eder
- Arka plan işleme için gelecekte queue sistemi eklenebilir

