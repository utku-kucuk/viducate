# Resend Domain Verification Rehberi

## Sorun
Resend test modunda **sadece kayıtlı email adresinize** (`utkcursor@gmail.com`) email gönderebiliyor. Diğer email adreslerine göndermek için domain doğrulaması yapmanız gerekiyor.

## Çözüm: Domain Verify Etme

### 1. Resend Dashboard'a Git
- https://resend.com/dashboard adresine git
- Login ol

### 2. Domain Ekleme
- Dashboard'da "Domains" sekmesine git
- "Add Domain" butonuna tıkla
- Domain'inizi girin (örn: `viducate.com` veya `mutkukucuk.com`)
- "Add" butonuna tıkla

### 3. DNS Kayıtlarını Ekleme
Resend size DNS kayıtlarını verecek. Bunları domain'inizin DNS ayarlarına eklemeniz gerekiyor:

**Örnek DNS Kayıtları:**
```
Type: TXT
Name: _resend
Value: (Resend'den verilecek değer)

Type: CNAME
Name: (Resend'den verilecek)
Value: (Resend'den verilecek)
```

### 4. DNS Doğrulaması
- DNS kayıtlarını ekledikten sonra, Resend'de "Verify" butonuna tıkla
- DNS propagation için birkaç dakika bekleyin (bazen 24 saat sürebilir)
- Domain verify olduğunda yeşil tik işareti görünecek

### 5. Environment Variable'ı Güncelle
Domain verify olduktan sonra `.env` dosyasını güncelle:

```bash
RESEND_FROM_EMAIL=Viducate <noreply@yourdomain.com>
```

Örnek:
```bash
RESEND_FROM_EMAIL=Viducate <noreply@viducate.com>
```

### 6. Backend'i Yeniden Başlat
```bash
cd backend
npm run dev
```

## Alternatif: Test Email Adresi Kullan
Şimdilik test için:
- Kullanıcı oluştururken email olarak `utkcursor@gmail.com` kullan
- Email gönderilecek
- Veya password dialog'unda şifreyi görüp manuel olarak kullanıcıya ilet

## Önemli Notlar
- Domain verify etmeden sadece kayıtlı email adresinize gönderebilirsiniz
- Domain verify ettikten sonra o domain'den gönderilen tüm emaillere gönderebilirsiniz
- Resend ücretsiz planında ayda 3000 email limiti var
- Domain verify işlemi genellikle 5-30 dakika sürer

## Hızlı Test İçin
1. Kullanıcı oluştur
2. Email gönderilemezse password dialog açılacak
3. Şifreyi kopyala ve kullanıcıya manuel olarak ilet
4. Veya test için `utkcursor@gmail.com` kullan

