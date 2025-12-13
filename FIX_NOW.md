# Hemen Yapılacaklar

## Sorunlar

1. ❌ Git pull yapılamıyor - `ecosystem.config.js` dosyasında local değişiklikler var
2. ❌ `frontendUrl` hala "not set" - Environment variables yüklenmiyor
3. ⚠️ Kullanıcı email'leri farklı - `teacher1@viducate.com` (siz `teacher1@example.com` deniyorsunuz)

## Çözüm

### 1. Git Çakışmasını Çöz

```bash
cd ~/viducate

# Local değişiklikleri stash'le
git stash

# Pull yap
git pull origin main

# Stash'i geri yükle (eğer gerekirse)
# git stash pop
```

### 2. Backend .env Dosyasını Kontrol Et

```bash
cat backend/.env | grep FRONTEND_URL
```

Eğer yoksa veya yanlışsa:

```bash
nano backend/.env
```

Şu satırı ekleyin/düzeltin:
```env
FRONTEND_URL=https://edu.mutkukucuk.com
```

### 3. PM2'yi Yeniden Başlat

```bash
pm2 delete viducate-backend
pm2 start ecosystem.config.js --update-env
pm2 save
```

### 4. Health Check'i Kontrol Et

```bash
curl https://edu.mutkukucuk.com/api/health
```

Artık `frontendUrl: "https://edu.mutkukucuk.com"` görünmeli.

### 5. Doğru Email ile Login Dene

Kullanıcılar `@viducate.com` domain'inde, `@example.com` değil:

**Doğru kullanıcılar:**
- `teacher1@viducate.com` / `teacher123`
- `admin1@viducate.com` / `admin123`
- `student1@viducate.com` / `student123`

Tarayıcıda bu email'lerle login deneyin.

### 6. Login Testi

```bash
# Doğru email ile test
curl -X POST https://edu.mutkukucuk.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://edu.mutkukucuk.com" \
  -d '{"email":"teacher1@viducate.com","password":"teacher123"}' \
  -v
```

Başarılı olmalı ve token dönmeli.

### 7. PM2 Loglarını Kontrol Et

```bash
pm2 logs viducate-backend --lines 30
```

Environment variables'ın yüklendiğini görmelisiniz.

## Özet

1. `git stash` → `git pull`
2. `backend/.env` dosyasında `FRONTEND_URL=https://edu.mutkukucuk.com` olmalı
3. PM2'yi `--update-env` ile yeniden başlat
4. Login için `teacher1@viducate.com` kullan (example.com değil!)
