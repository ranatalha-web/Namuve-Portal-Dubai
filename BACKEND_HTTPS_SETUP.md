# Backend HTTPS Setup - Fix Mixed Content Error

## ✅ Problem Identified

**Error:** `Mixed Content: The page was loaded over HTTPS, but requested an insecure resource 'http://...'`

**Cause:** Frontend is HTTPS, but backend is HTTP. Browsers block this.

**Solution:** Set up HTTPS on backend port 5000

---

## Two Options:

### Option 1: Use Nginx Reverse Proxy (Recommended) ✅

Nginx handles HTTPS, forwards to backend on HTTP.

**Benefits:**
- Backend stays on HTTP (simpler)
- Nginx handles SSL certificates
- Better performance
- Easier to manage

**Setup:**

1. **Create Nginx config for backend:**
```bash
sudo nano /etc/nginx/sites-available/backend
```

Add:
```nginx
server {
    listen 5000 ssl;
    server_name uaeportal.namuve.com;

    ssl_certificate /etc/letsencrypt/live/uaeportal.namuve.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/uaeportal.namuve.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. **Enable the config:**
```bash
sudo ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

3. **Change backend to run on port 5001:**
```bash
# In backend .env or environment
PORT=5001
```

4. **Restart backend:**
```bash
npm start
# or
pm2 restart dashboard-backend
```

---

### Option 2: Enable HTTPS in Node.js Backend

Backend handles HTTPS directly.

**Setup:**

1. **Update backend server.js:**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/uaeportal.namuve.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/uaeportal.namuve.com/fullchain.pem')
};

const app = require('./app');
const PORT = process.env.PORT || 5000;

https.createServer(options, app).listen(PORT, () => {
  console.log(`🚀 Backend running on https://localhost:${PORT}`);
});
```

2. **Restart backend:**
```bash
npm start
```

---

## Recommended: Option 1 (Nginx Reverse Proxy)

**Why:**
- Simpler backend code
- Better performance
- Easier certificate management
- Industry standard

---

## Complete Setup Steps:

### Step 1: Rebuild Frontend
```bash
cd frontend
npm run build
```

### Step 2: Deploy Frontend
```bash
scp -r build/ root@137.184.14.198:/var/www/app/
```

### Step 3: Setup Backend HTTPS (Choose Option 1 or 2)

**Option 1 - Nginx Reverse Proxy:**
```bash
ssh root@137.184.14.198

# Create nginx config
sudo nano /etc/nginx/sites-available/backend

# Add the config from above

# Enable it
sudo ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/

# Test
sudo nginx -t

# Restart
sudo systemctl restart nginx

# Change backend port to 5001
cd /path/to/backend
# Edit .env: PORT=5001

# Restart backend
npm start
```

**Option 2 - Node.js HTTPS:**
```bash
ssh root@137.184.14.198

# Update server.js with HTTPS code above

# Restart backend
npm start
```

### Step 4: Restart Frontend Web Server
```bash
ssh root@137.184.14.198
sudo systemctl restart nginx
```

### Step 5: Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R`
- Clear all cache

### Step 6: Test Login
```
https://uaeportal.namuve.com
```

Should work without mixed content errors ✅

---

## Verification:

### Check Frontend is HTTPS
```bash
curl -I https://uaeportal.namuve.com
```

Should show: `HTTP/2 200` with valid certificate

### Check Backend is HTTPS
```bash
curl -I https://uaeportal.namuve.com:5000/api/health
```

Should show: `HTTP/2 200` with valid certificate

---

## Troubleshooting:

### Still Getting Mixed Content Error?
1. Verify backend is on HTTPS: `curl -I https://uaeportal.namuve.com:5000/api/health`
2. Hard refresh: `Ctrl+Shift+R`
3. Clear all cache
4. Try incognito mode

### Backend Not Responding?
1. Check if running: `ps aux | grep node`
2. Check logs: `pm2 logs dashboard-backend`
3. Restart: `npm start`

### SSL Certificate Error?
1. Verify certificate exists: `ls -la /etc/letsencrypt/live/uaeportal.namuve.com/`
2. Renew if needed: `sudo certbot renew`

---

## Summary:

✅ **Frontend code updated to use same protocol as backend**
✅ **Backend needs HTTPS on port 5000**
✅ **Use Nginx reverse proxy (Option 1) for simplicity**
✅ **No more mixed content errors**

---

**Last Updated:** December 8, 2025
**Status:** ✅ Ready for HTTPS Setup
