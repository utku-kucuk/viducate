# Viducate - Global Online Education Platform

Viducate, öğretmenlerin video içerik yükleyebileceği ve öğrencilerin bu içerikleri takip edebileceği modern bir online eğitim platformudur.

## Özellikler

### Öğretmen Paneli
- Video yükleme ve yönetimi
- Eğitim sekmeleri oluşturma
- Öğrenci ilerleme takibi
- İçerik organizasyonu

### Öğrenci Paneli
- Video izleme ve takip
- İlerleme kaydetme
- Eğitim içeriklerine erişim

### Admin Paneli
- Kullanıcı yönetimi (CRUD)
- Platform geneli yönetim
- İstatistikler ve raporlar

### Güvenlik
- JWT tabanlı kimlik doğrulama
- Şifreli veri transferi
- Rol tabanlı erişim kontrolü

## Teknolojiler

- **Frontend**: React.js, Material-UI
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **File Storage**: AWS S3 (video dosyaları için)

## Kurulum

1. Projeyi klonlayın
2. Gerekli paketleri yükleyin: `npm run install-all`
3. PostgreSQL veritabanını kurun ve yapılandırın
4. Environment değişkenlerini ayarlayın
5. Geliştirme sunucusunu başlatın: `npm run dev`

## Environment Variables

Backend klasöründe `.env` dosyası oluşturun:

```
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/viducate
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
```

## Video İzleme Algoritması

Platform, öğrencilerin video izleme durumunu şu kriterlere göre değerlendirir:
- Video izleme yüzdesi (%80+ tamamlanma)
- İzleme süresi (video uzunluğunun %75'i)
- Kullanıcı etkileşimi (pause, seek, replay)
- Oturum sürekliliği

## Lisans

MIT License
