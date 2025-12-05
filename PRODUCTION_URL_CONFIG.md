# Production URL Configuration - 137.184.14.198

## ✅ Configuration Complete

Your production URL `137.184.14.198` has been configured in the code.

---

## What Was Changed:

### Frontend (`/frontend/src/config/api.js`)
```javascript
// Automatically detects production URL
if (window.location.hostname === '137.184.14.198' || window.location.hostname === 'portal.namuve.com') {
  return 'http://137.184.14.198:5000';
}
```

**Result:** When users access `http://137.184.14.198`, frontend automatically connects to backend on `http://137.184.14.198:5000`

### Backend (`/backend/src/app.js`)
CORS already configured to allow:
- `http://137.184.14.198`
- `http://137.184.14.198:3000`
- `https://portal.namuve.com`

---

## How It Works:

### User accesses: `http://137.184.14.198`
1. Frontend loads from `http://137.184.14.198`
2. Frontend detects hostname is `137.184.14.198`
3. Frontend automatically connects to backend at `http://137.184.14.198:5000`
4. Login works ✅
5. All API calls work ✅

---

## Deployment Steps:

### Step 1: Rebuild Frontend
```bash
cd frontend
npm run build
```

### Step 2: Deploy Build Folder
Copy the `build` folder to your server:
```bash
scp -r build/ root@137.184.14.198:/var/www/app/
```

### Step 3: Restart Web Server
```bash
ssh root@137.184.14.198
sudo systemctl restart nginx
# or
sudo systemctl restart apache2
```

### Step 4: Verify Backend is Running
```bash
ssh root@137.184.14.198
pm2 status
# or
systemctl status dashboard-backend
```

### Step 5: Test Login
1. Open browser: `http://137.184.14.198`
2. Try login
3. Should work without errors ✅

---

## Troubleshooting:

### Still getting `ERR_CONNECTION_REFUSED`?

**Check 1: Backend is running**
```bash
curl http://137.184.14.198:5000/api/health
```

Should return: `{"status":"healthy",...}`

**Check 2: Port 5000 is open**
```bash
sudo ufw allow 5000
```

**Check 3: Nginx/Apache is configured correctly**
Make sure web server serves frontend from `/var/www/app/build`

**Check 4: Clear browser cache**
- Hard refresh: `Ctrl+Shift+R`
- Clear all cache
- Try incognito mode

---

## Environment Variables on Server:

### Backend (.env)
```
PORT=5000
NODE_ENV=production
HOSTAWAY_AUTH_TOKEN=Bearer eyJ0eXAi...
TEABLE_BASE_URL=https://teable.namuve.com/api/table/tblq9gnsTEbz2IqQQLK/record
TEABLE_BEARER_TOKEN=teable_accSgExX4...
TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN=teable_accSgExX4...
TEABLE_ROOM_RESERVATIONS_BEARER_TOKEN=teable_accSgExX4...
JWT_SECRET=dashboard-jwt-secret-key-2024
EXCHANGE_RATE_API_KEY=cbb36a5aeba2aa9dbaa251e0
```

### Frontend (.env.production)
```
REACT_APP_API_URL=http://137.184.14.198:5000
```

---

## URLs:

| Service | URL |
|---------|-----|
| Frontend | `http://137.184.14.198` |
| Backend API | `http://137.184.14.198:5000` |
| Login Endpoint | `http://137.184.14.198:5000/api/auth/login` |
| Health Check | `http://137.184.14.198:5000/api/health` |

---

## Testing Checklist:

- [ ] Frontend loads at `http://137.184.14.198`
- [ ] No manifest.json error (hard refresh if needed)
- [ ] Login page displays
- [ ] Can enter username/password
- [ ] Login button works
- [ ] No connection errors
- [ ] Dashboard loads after login
- [ ] All API endpoints respond

---

## Next Steps:

1. **Build frontend:** `npm run build`
2. **Deploy build folder to server**
3. **Restart web server**
4. **Verify backend is running**
5. **Test login at `http://137.184.14.198`**

---

**Status:** ✅ Production URL Configured
**Last Updated:** December 5, 2025
