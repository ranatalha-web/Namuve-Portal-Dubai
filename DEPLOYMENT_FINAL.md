# Final Deployment - Single Domain Setup

## ✅ New Architecture

```
https://uaeportal.namuve.com
    ↓
Nginx (port 443)
    ├─ /api/* → Backend (port 5000)
    └─ /* → Frontend (static files)
```

**URLs:**
- Frontend: `https://uaeportal.namuve.com`
- Login API: `https://uaeportal.namuve.com/api/auth/login`
- Health: `https://uaeportal.namuve.com/api/health`

---

## Deployment Steps

### Step 1: Update Frontend Code (Already Done ✅)

Frontend now uses:
```javascript
return `${protocol}//${hostname}`;
// Returns: https://uaeportal.namuve.com
```

### Step 2: Rebuild Frontend

```bash
cd frontend
npm install
NODE_OPTIONS="--max_old_space_size=4096" npm run build
```

### Step 3: Deploy Frontend

```bash
sudo rm -rf /var/www/portal
sudo mkdir -p /var/www/portal
sudo cp -r build/* /var/www/portal/
sudo chown -R www-data:www-data /var/www/portal
```

### Step 4: Update Nginx Config

**On production server:**

```bash
# Remove old backend config
sudo rm /etc/nginx/sites-enabled/backend
sudo rm /etc/nginx/sites-available/backend

# Create main config
sudo nano /etc/nginx/sites-available/default
```

**Delete everything and paste this:**

```nginx
server {
    listen 443 ssl http2;
    server_name uaeportal.namuve.com;

    ssl_certificate /etc/letsencrypt/live/uaeportal.namuve.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/uaeportal.namuve.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend static files
    root /var/www/portal;
    index index.html;

    # API routes - proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend routes - serve index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name uaeportal.namuve.com;
    return 301 https://$server_name$request_uri;
}
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 5: Test Nginx Config

```bash
sudo nginx -t
```

Should show: `syntax is ok` and `test is successful`

### Step 6: Restart Nginx

```bash
sudo systemctl restart nginx
```

### Step 7: Ensure Backend is on Port 5000

```bash
# Check backend .env
cat /root/portal/Namuve-Portal-Dubai/backend/.env | grep PORT

# Should show: PORT=5000
```

If it shows 5001, change it back to 5000:

```bash
nano /root/portal/Namuve-Portal-Dubai/backend/.env
# Change PORT=5001 to PORT=5000

# Restart backend
pm2 restart portal-backend
```

### Step 8: Verify Everything

```bash
# Check frontend is served
curl -I https://uaeportal.namuve.com

# Check API is working
curl -I https://uaeportal.namuve.com/api/health

# Both should return HTTP/2 200
```

### Step 9: Clear Browser Cache

- Hard refresh: `Ctrl+Shift+R`
- Clear all cache

### Step 10: Test Login

```
https://uaeportal.namuve.com
```

Should work! ✅

---

## Complete Command Sequence

```bash
# On production server
ssh root@137.184.14.198

# Remove old configs
sudo rm /etc/nginx/sites-enabled/backend
sudo rm /etc/nginx/sites-available/backend

# Update main config (paste the config above)
sudo nano /etc/nginx/sites-available/default

# Test
sudo nginx -t

# Restart
sudo systemctl restart nginx

# Ensure backend on port 5000
cat /root/portal/Namuve-Portal-Dubai/backend/.env | grep PORT

# If needed, change to 5000 and restart
# nano /root/portal/Namuve-Portal-Dubai/backend/.env
# pm2 restart portal-backend

# Verify
curl -I https://uaeportal.namuve.com
curl -I https://uaeportal.namuve.com/api/health
```

---

## Architecture Benefits

✅ **Single domain** - No port confusion
✅ **Clean URLs** - `/api/auth/login` instead of `:5000/api/auth/login`
✅ **No mixed content** - All HTTPS
✅ **Better UX** - No port numbers visible
✅ **Industry standard** - How most production apps work

---

## Troubleshooting

### Still Getting SSL Error?
```bash
# Verify nginx is listening on 443
sudo ss -tlnp | grep 443

# Should show LISTEN on port 443
```

### API Not Responding?
```bash
# Check backend is running
ps aux | grep node

# Check backend is on port 5000
curl http://localhost:5000/api/health
```

### Frontend Not Loading?
```bash
# Check files are deployed
ls -la /var/www/portal/

# Should show index.html and other files
```

---

## Summary

✅ **Frontend code updated**
✅ **Nginx config ready**
✅ **Backend stays on port 5000**
✅ **Single domain, clean URLs**
✅ **All HTTPS, no mixed content**

**Just follow the deployment steps and you're done!** 🎉

---

**Last Updated:** December 8, 2025
**Status:** ✅ Production Ready
