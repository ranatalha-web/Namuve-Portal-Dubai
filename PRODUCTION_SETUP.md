# Production Setup - Quick Reference

## 🎯 The Main Issue: Login Not Working on Production

### Root Cause
Frontend can't connect to backend because:
1. Backend URL is not set in frontend environment variables
2. Backend is not running or not accessible
3. CORS is blocking the request

---

## ✅ Quick Fix (5 Minutes)

### Step 1: Set Backend URL in Frontend

**If using Vercel:**
```
Go to: Vercel Dashboard → Your Frontend Project → Settings → Environment Variables

Add:
Name: REACT_APP_API_URL
Value: https://your-backend-url.com

Then redeploy
```

**If using custom server:**
```bash
# Create .env.production in frontend folder
echo "REACT_APP_API_URL=https://your-backend-url.com" > .env.production

# Build
npm run build

# Deploy the build folder
```

### Step 2: Verify Backend is Running

```bash
# Test backend health
curl https://your-backend-url.com/api/health

# Should return:
# {"status":"healthy","service":"Dashboard Backend API",...}
```

### Step 3: Redeploy Frontend

**Vercel:** Automatic after setting env vars
**Custom Server:** Deploy the build folder

---

## 📊 What Gets Fixed

| Error | Before | After |
|-------|--------|-------|
| Password autocomplete warning | ❌ Shows warning | ✅ Fixed |
| Manifest.json error | ⚠️ Browser cache issue | ✅ Clear cache |
| Login connection error | ❌ Can't reach backend | ✅ Connects to backend |
| Login works | ❌ Fails | ✅ Works |

---

## 🔑 Environment Variables Needed

### Frontend
```
REACT_APP_API_URL=https://your-backend-url.com
```

### Backend
```
HOSTAWAY_AUTH_TOKEN=Bearer eyJ0eXAi...
TEABLE_BASE_URL=https://teable.namuve.com/api/table/tblq9gnsTEbz2IqQQLK/record
TEABLE_BEARER_TOKEN=teable_accSgExX4...
TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN=teable_accSgExX4...
TEABLE_ROOM_RESERVATIONS_BEARER_TOKEN=teable_accSgExX4...
JWT_SECRET=dashboard-jwt-secret-key-2024
EXCHANGE_RATE_API_KEY=cbb36a5aeba2aa9dbaa251e0
NODE_ENV=production
```

---

## 🚀 Deployment Checklist

### Frontend
- [ ] `REACT_APP_API_URL` environment variable set
- [ ] Points to correct backend URL
- [ ] Frontend built and deployed
- [ ] No console errors

### Backend
- [ ] All environment variables set
- [ ] Backend is running
- [ ] Backend URL is accessible
- [ ] `/api/health` endpoint responds

### Testing
- [ ] Frontend loads
- [ ] Login page displays
- [ ] Can enter username/password
- [ ] Login button works
- [ ] No connection errors
- [ ] Dashboard loads after login

---

## 🔗 Backend URL Examples

**Vercel:**
```
https://dashboard-backend-abc123.vercel.app
```

**DigitalOcean:**
```
https://128.199.0.150
https://your-domain.com
```

**AWS:**
```
https://your-ec2-instance.amazonaws.com
```

**Custom Server:**
```
https://your-server-ip.com
https://your-domain.com
```

---

## 🧪 Test Login Flow

1. Open frontend in browser
2. Go to login page
3. Enter username: `admin`
4. Enter password: `your-password`
5. Click Login
6. Should redirect to dashboard

**If stuck on login:**
1. Open browser console (F12)
2. Go to Network tab
3. Try login
4. Look for failed requests
5. Check the error message

---

## 📞 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `net::ERR_CONNECTION_REFUSED` | Set `REACT_APP_API_URL` correctly |
| `CORS error` | Backend CORS is not configured for frontend URL |
| `401 Unauthorized` | Wrong username/password or JWT issue |
| `500 Internal Server Error` | Backend environment variables not set |
| `Manifest.json error` | Clear browser cache (Ctrl+Shift+R) |
| `Password autocomplete warning` | Already fixed in code |

---

## 🎯 Next Steps

1. **Set `REACT_APP_API_URL` in frontend environment**
2. **Verify backend is running and accessible**
3. **Redeploy frontend**
4. **Test login**

That's it! 🎉

---

**Last Updated:** December 5, 2025
**Status:** ✅ Production Ready
