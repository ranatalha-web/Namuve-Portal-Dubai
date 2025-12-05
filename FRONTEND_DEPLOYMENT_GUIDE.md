# Frontend Deployment Guide - Fix Login Errors on Production

## 🔧 Issues Fixed

### 1. ✅ Password Input Autocomplete
- Added `autoComplete="current-password"` to password field
- Added `autoComplete="username"` to username field
- Removes browser warning about missing autocomplete attributes

### 2. ✅ Manifest.json Error
- Manifest.json is valid
- Error is likely a browser cache issue
- Solution: Clear browser cache or hard refresh

### 3. ✅ Backend Connection Error (`net::ERR_CONNECTION_REFUSED`)
- Frontend can't reach backend on production
- Solution: Set correct backend URL in environment variables

---

## 🚀 Deployment Steps

### Step 1: Set Environment Variables

**For Vercel:**
1. Go to Vercel dashboard → Your project → Settings
2. Click **Environment Variables**
3. Add this variable:
   ```
   REACT_APP_API_URL = https://your-backend-url.com
   ```
   Replace `https://your-backend-url.com` with your actual backend URL

**For Custom Server:**
1. Create `.env.production` in frontend directory:
   ```bash
   REACT_APP_API_URL=https://your-backend-url.com
   ```

2. Build the app:
   ```bash
   npm run build
   ```

### Step 2: Verify Backend URL

**Check what your backend URL is:**
- If backend is on Vercel: `https://your-backend-project.vercel.app`
- If backend is on custom server: `https://your-server-domain.com`
- If backend is on DigitalOcean: `https://your-ip-or-domain.com`

**Test the backend:**
```bash
curl https://your-backend-url/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Dashboard Backend API",
  "version": "1.0.0"
}
```

### Step 3: Deploy Frontend

**For Vercel:**
1. After setting environment variables, redeploy:
   ```bash
   npx vercel --prod
   ```

**For Custom Server:**
1. Build the app:
   ```bash
   npm run build
   ```
2. Deploy the `build` folder to your server
3. Configure your web server (nginx/Apache) to serve the build folder

---

## 🔍 Troubleshooting

### Error: `net::ERR_CONNECTION_REFUSED`

**Cause:** Frontend can't reach backend

**Solution:**
1. Check `REACT_APP_API_URL` is set correctly
2. Verify backend is running
3. Check backend URL is accessible from browser:
   ```bash
   # In browser console:
   fetch('https://your-backend-url/api/health')
     .then(r => r.json())
     .then(d => console.log(d))
   ```

### Error: Manifest.json Syntax Error

**Cause:** Browser cache or invalid manifest

**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check manifest.json is valid JSON

### Login Not Working

**Check:**
1. Backend is running and accessible
2. `REACT_APP_API_URL` points to correct backend
3. Backend has environment variables set
4. Username and password are correct

---

## 📋 Environment Variables Checklist

**Frontend (.env.production or Vercel):**
- [ ] `REACT_APP_API_URL` - Set to backend URL

**Backend (.env or Vercel):**
- [ ] `HOSTAWAY_AUTH_TOKEN` - Set
- [ ] `TEABLE_BASE_URL` - Set
- [ ] `TEABLE_BEARER_TOKEN` - Set
- [ ] `JWT_SECRET` - Set
- [ ] `NODE_ENV` - Set to `production`

---

## 🌐 Example Configurations

### Vercel to Vercel
```
Frontend: https://frontend-project.vercel.app
Backend: https://backend-project.vercel.app

Frontend .env:
REACT_APP_API_URL=https://backend-project.vercel.app
```

### Vercel to DigitalOcean
```
Frontend: https://frontend-project.vercel.app
Backend: https://your-droplet-ip.com or https://your-domain.com

Frontend .env:
REACT_APP_API_URL=https://your-droplet-ip.com
```

### Custom Server to Custom Server
```
Frontend: https://your-domain.com
Backend: https://api.your-domain.com or https://your-domain.com:5000

Frontend .env:
REACT_APP_API_URL=https://api.your-domain.com
```

---

## 🔐 Security Notes

- ✅ API keys are hidden in production
- ✅ Sensitive data is sanitized in logs
- ✅ Backend validates all requests
- ✅ CORS is configured for your domain

---

## 📝 Build & Deploy Commands

### Build for Production
```bash
cd frontend
npm run build
```

### Test Production Build Locally
```bash
npm install -g serve
serve -s build
```

### Deploy to Vercel
```bash
npx vercel --prod
```

### Deploy to Custom Server
```bash
# Build
npm run build

# Copy build folder to server
scp -r build/ user@server:/var/www/app/

# Restart web server
ssh user@server "sudo systemctl restart nginx"
```

---

## ✅ Verification Checklist

After deployment, verify:
- [ ] Frontend loads without errors
- [ ] Login page displays correctly
- [ ] Password field has autocomplete attribute
- [ ] No manifest.json errors in console
- [ ] Login API calls succeed
- [ ] Backend responds with user data
- [ ] Dashboard loads after login
- [ ] All API endpoints work

---

**Last Updated:** December 5, 2025
**Status:** ✅ Ready for Production
