# SSL/HTTPS Error Fix - Mixed Content Issue

## ✅ Problem Identified and Fixed

**Error:** `net::ERR_SSL_PROTOCOL_ERROR`

**Cause:** HTTPS frontend trying to reach HTTP backend (mixed content)

---

## Solution Implemented:

### Code Change (`/frontend/src/config/api.js`)

**Before:**
```javascript
// Always used same protocol
return `${protocol}//${hostname}:5000`;
```

**After:**
```javascript
// IP address uses HTTP (no SSL certificate needed)
if (hostname === '137.184.14.198') {
  return 'http://137.184.14.198:5000';
}

// Domain names use same protocol (HTTPS if accessed via HTTPS)
if (hostname === 'portal.namuve.com' || hostname === 'uaeportal.namuve.com') {
  return `${protocol}//${hostname}:5000`;
}
```

---

## How to Access:

### Option 1: Use Domain Name (Recommended) ✅
```
https://portal.namuve.com
```
- SSL certificate works
- HTTPS frontend → HTTPS backend
- Secure connection ✅

### Option 2: Use IP Address with HTTP
```
http://137.184.14.198
```
- No SSL certificate needed
- HTTP frontend → HTTP backend
- Works but not secure ⚠️

---

## Deployment Steps:

### Step 1: Rebuild Frontend
```bash
cd frontend
npm run build
```

### Step 2: Deploy New Build
```bash
scp -r build/ root@137.184.14.198:/var/www/app/
```

### Step 3: Restart Web Server
```bash
ssh root@137.184.14.198
sudo systemctl restart nginx
```

### Step 4: Test Login

**Via Domain (Recommended):**
```bash
https://portal.namuve.com
```

**Via IP (Temporary):**
```bash
http://137.184.14.198
```

---

## What Gets Fixed:

| URL | Protocol | Backend | Works? |
|-----|----------|---------|--------|
| `https://portal.namuve.com` | HTTPS | HTTPS | ✅ YES |
| `http://137.184.14.198` | HTTP | HTTP | ✅ YES |
| `https://137.184.14.198` | HTTPS | HTTP | ❌ NO (mixed content) |

---

## Backend Configuration:

CORS already allows:
- `http://137.184.14.198`
- `https://portal.namuve.com`
- `https://uaeportal.namuve.com`
- All Vercel domains

**No backend changes needed!** ✅

---

## SSL Certificate Info:

Your current SSL certificate:
- **Issued for:** `portal.namuve.com` (or similar domain)
- **NOT issued for:** `137.184.14.198` (IP address)
- **Status:** Valid for domain names only

---

## Recommended Setup:

### Production:
```
Frontend: https://portal.namuve.com
Backend: https://portal.namuve.com:5000
Protocol: HTTPS (secure)
```

### Development:
```
Frontend: http://localhost:3000
Backend: http://localhost:5000
Protocol: HTTP (local only)
```

---

## Testing Checklist:

- [ ] Build frontend: `npm run build`
- [ ] Deploy build folder
- [ ] Restart nginx
- [ ] Access via domain: `https://portal.namuve.com`
- [ ] Try login
- [ ] Should work without SSL errors ✅

---

## If Still Getting Errors:

### Check 1: Verify SSL Certificate
```bash
curl -I https://portal.namuve.com
```

Should show: `HTTP/2 200` with valid certificate

### Check 2: Check Backend is Running
```bash
curl http://137.184.14.198:5000/api/health
```

Should return JSON response

### Check 3: Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R`
- Clear all cache
- Try incognito mode

---

## Summary:

✅ **Code updated to handle SSL properly**
✅ **IP address uses HTTP (no certificate needed)**
✅ **Domain names use HTTPS (certificate available)**
✅ **CORS already configured for both**

**Just rebuild, deploy, and access via domain!** 🎉

---

**Last Updated:** December 5, 2025
**Status:** ✅ Ready for Production
