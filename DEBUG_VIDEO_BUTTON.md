# Video Start Butonu Debug Kılavuzu

## Sorun
Start butonuna basıldığında hiçbir şey olmuyor, console'da da hiçbir şey görünmüyor.

## Debug Adımları

### 1. Browser Console'u Açın

1. Tarayıcıda F12'ye basın
2. Console sekmesine gidin
3. Sayfayı yenileyin (F5)
4. Kurs detay sayfasına gidin

### 2. Console'da Arayın

Şu mesajları arayın:
- `"Video Button State:"` - Her video butonu için state bilgisi
- `"Start button clicked!"` - Butona tıklandığında
- `"Navigating to:"` - Navigate edilirken

### 3. Butonun Disabled Olup Olmadığını Kontrol Edin

Browser'da butona sağ tıklayın → "Inspect Element" → Elements sekmesinde butonu bulun ve `disabled` attribute'u var mı kontrol edin.

### 4. Network Tab'ını Kontrol Edin

1. Network sekmesine gidin
2. Start butonuna tıklayın
3. Yeni bir request görünüyor mu? (video player sayfası için)

### 5. React DevTools Kullanın

Eğer React DevTools yüklüyse:
1. React sekmesine gidin
2. CourseDetail component'ini bulun
3. `navigate` fonksiyonunun tanımlı olduğunu kontrol edin

## Manuel Test

Browser console'da şu komutu çalıştırın:

```javascript
// Tüm video butonlarını bul
const buttons = document.querySelectorAll('button');
buttons.forEach((btn, idx) => {
  if (btn.textContent.includes('Start') || btn.textContent.includes('Continue')) {
    console.log(`Button ${idx}:`, {
      text: btn.textContent,
      disabled: btn.disabled,
      onClick: btn.onclick
    });
  }
});
```

## Hızlı Çözüm

Eğer buton disabled ise, geçici olarak disabled kontrolünü kaldırabilirsiniz:

```javascript
// Browser console'da
const buttons = document.querySelectorAll('button[disabled]');
buttons.forEach(btn => {
  btn.disabled = false;
  console.log('Enabled button:', btn.textContent);
});
```

Sonra butona tıklayın ve çalışıp çalışmadığını görün.

## Sorun Devam Ederse

1. **Console log'larını paylaşın** - "Video Button State:" mesajlarını
2. **Network tab screenshot'ı** - Butona tıkladığınızda ne oluyor?
3. **Elements tab** - Buton HTML'ini paylaşın
