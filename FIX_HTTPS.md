# HTTPS Sorunu Düzeltme

## Sorun
`https://edu.mutkukucuk.com` adresine gidildiğinde "This site can't be reached" hatası alınıyor.
HTTP çalışıyor ama HTTPS çalışmıyor.

## Olası Nedenler

1. **SSL sertifikası yok veya yanlış yapılandırılmış**
2. **Nginx SSL yapılandırması eksik**
3. **Port 443 açık değil**
4. **Firewall SSL portunu engelliyor**

## Çözüm Adımları

### 1. SSL Sertifikası Kontrolü

```bash
sudo certbot certificates
```

Eğer sertifika yoksa veya süresi dolmuşsa:

```bash
sudo certbot --nginx -d edu.mutkukucuk.com
```

### 2. Nginx SSL Yapılandırması

Nginx yapılandırma dosyanızı kontrol edin:

```bash
sudo nano /etc/nginx/sites-available/edu.mutkukucuk.com
```

**HTTPS için şu yapılandırmayı ekleyin:**

```nginx
# HTTP'den HTTPS'e yönlendirme
server {
    listen 80;
    server_name edu.mutkukucuk.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name edu.mutkukucuk.com;
    
    # SSL sertifikaları
    ssl_certificate /etc/letsencrypt/live/edu.mutkukucuk.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edu.mutkukucuk.com/privkey.pem;
    
    # SSL yapılandırması
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Allow large video uploads
    client_max_body_size 5G;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Frontend (React build)
    location / {
        root /home/utku/viducate/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Video uploads - Range request support for streaming
    location /uploads/ {
        alias /home/utku/viducate/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public";
        add_header Accept-Ranges bytes;
        
        # Specific settings for video files (critical for streaming)
        location ~* \.(mp4|webm|avi|mov|wmv|flv|mkv)$ {
            add_header Cache-Control "public, max-age=3600";
            add_header Accept-Ranges bytes;
            
            # Optimized settings for video streaming
            sendfile on;
            tcp_nopush on;
            tcp_nodelay on;
            
            # For Range request support
            proxy_max_temp_file_size 0;
        }
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8080/api/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Nginx'i Test Et ve Yeniden Yükle

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Port Kontrolü

```bash
# Port 443'ün açık olduğundan emin olun
sudo netstat -tlnp | grep 443
sudo lsof -i :443
```

### 5. Firewall Kontrolü

```bash
# UFW kullanıyorsanız
sudo ufw status
sudo ufw allow 443/tcp

# veya iptables
sudo iptables -L -n | grep 443
```

### 6. Router Port Forwarding

Router'ınızda port 443'ün sunucunuza yönlendirildiğinden emin olun:
- External Port: 443
- Internal IP: Sunucunuzun IP adresi
- Internal Port: 443
- Protocol: TCP

### 7. SSL Test

```bash
# SSL bağlantısını test edin
openssl s_client -connect edu.mutkukucuk.com:443 -servername edu.mutkukucuk.com

# veya
curl -vI https://edu.mutkukucuk.com
```

## Alternatif: Let's Encrypt ile SSL Kurulumu

Eğer SSL sertifikası yoksa:

```bash
# Certbot'u yükleyin (eğer yoksa)
sudo apt update
sudo apt install certbot python3-certbot-nginx

# SSL sertifikası oluşturun
sudo certbot --nginx -d edu.mutkukucuk.com

# Otomatik yenileme için
sudo certbot renew --dry-run
```

## Hızlı Test

```bash
# HTTP test
curl -I http://edu.mutkukucuk.com

# HTTPS test
curl -I https://edu.mutkukucuk.com

# SSL sertifika bilgisi
echo | openssl s_client -servername edu.mutkukucuk.com -connect edu.mutkukucuk.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Sorun Devam Ederse

1. **Nginx error log:**
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

2. **System log:**
   ```bash
   sudo journalctl -u nginx -n 50
   ```

3. **DNS kontrolü:**
   ```bash
   nslookup edu.mutkukucuk.com
   dig edu.mutkukucuk.com
   ```

4. **Port dinleme kontrolü:**
   ```bash
   sudo ss -tlnp | grep :443
   ```
