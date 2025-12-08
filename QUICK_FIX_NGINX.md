# Quick Fix - Nginx Backend HTTPS Configuration

## ✅ Problem Identified

**Error:** `WRONG_VERSION_NUMBER` - Backend receiving HTTPS but configured for HTTP

**Cause:** Nginx config is trying to send HTTPS to HTTP backend

**Solution:** Use correct nginx config that sends HTTP to backend

---

## The Issue:

```
Nginx listens: HTTPS (port 5000)
Nginx forwards to: HTTP (port 5001)  ← This is correct!

But the config might be wrong.
```

---

## Fix (Do This Now):

### Step 1: SSH to Server
```bash
ssh root@137.184.14.198
```

### Step 2: Update Nginx Config
```bash
sudo nano /etc/nginx/sites-available/backend
```

**Delete everything and paste this:**

```nginx
server {
    listen 5000 ssl;
    server_name uaeportal.namuve.com;

    ssl_certificate /etc/letsencrypt/live/uaeportal.namuve.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/uaeportal.namuve.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        # IMPORTANT: Use http:// (not https://) because backend is on HTTP
        proxy_pass http://localhost:5001;
        
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
}
```

Press: `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Test Nginx Config
```bash
sudo nginx -t
```

Should show: `syntax is ok` and `test is successful`

### Step 4: Restart Nginx
```bash
sudo systemctl restart nginx
```

### Step 5: Verify Backend is Running on Port 5001
```bash
curl http://localhost:5001/api/health
```

Should return JSON (not error)

### Step 6: Test HTTPS Port 5000
```bash
curl -I https://uaeportal.namuve.com:5000/api/health
```

Should show: `HTTP/2 200` (not SSL error)

### Step 7: Rebuild Frontend (on your local machine)
```bash
cd frontend
npm run build
```

### Step 8: Deploy Frontend
```bash
scp -r build/ root@137.184.14.198:/var/www/app/
```

### Step 9: Restart Frontend Web Server
```bash
ssh root@137.184.14.198
sudo systemctl restart nginx
```

### Step 10: Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R`
- Clear all cache

### Step 11: Test Login
```
https://uaeportal.namuve.com
```

Should work! ✅

---

## Key Points:

✅ **Nginx listens on HTTPS port 5000**
✅ **Nginx forwards to HTTP port 5001**
✅ **Backend runs on HTTP port 5001**
✅ **No SSL error on backend**

---

## Verification:

### Check Nginx is listening on 5000
```bash
sudo netstat -tlnp | grep 5000
```

Should show: `LISTEN` on port 5000

### Check Backend is on 5001
```bash
sudo netstat -tlnp | grep 5001
```

Should show: `LISTEN` on port 5001

### Test the flow
```bash
# Frontend can reach backend via HTTPS
curl -I https://uaeportal.namuve.com:5000/api/health

# Should work without SSL errors
```

---

## If Still Getting Error:

### Check 1: Verify Backend is Running
```bash
ps aux | grep node
```

Should show node process running

### Check 2: Check Backend Logs
```bash
pm2 logs dashboard-backend
# or
tail -f /path/to/backend/logs.txt
```

### Check 3: Restart Everything
```bash
# Restart backend
pm2 restart dashboard-backend
# or
npm start

# Restart nginx
sudo systemctl restart nginx

# Clear browser cache and try again
```

---

## Summary:

✅ **Correct nginx config provided**
✅ **Nginx → HTTPS (port 5000)**
✅ **Backend → HTTP (port 5001)**
✅ **No more SSL errors**

**Follow all 11 steps and it will work!** 🎉

---

**Last Updated:** December 8, 2025
**Status:** ✅ Ready to Deploy
