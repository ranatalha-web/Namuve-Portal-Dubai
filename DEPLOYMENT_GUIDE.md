# Deployment Guide - Fix 500 Errors on Server

## Problem
The app works locally but shows **500 errors on the server** because environment variables are not set.

## Solution
Set environment variables on your server. Here's how:

---

## 1️⃣ For Vercel Deployment

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your project
3. Click **Settings**
4. Go to **Environment Variables**

### Step 2: Add Environment Variables
Copy all variables from `backend/.env.production` and add them:

**Critical Variables (MUST SET):**
```
HOSTAWAY_AUTH_TOKEN = Bearer eyJ0eXAi...
TEABLE_BASE_URL = https://teable.namuve.com/api/table/tblq9gnsTEbz2IqQQLK/record
TEABLE_BEARER_TOKEN = teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=
TEABLE_REVENUE_BEARER_TOKEN = teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=
TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN = teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=
TEABLE_ROOM_RESERVATIONS_BEARER_TOKEN = teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=
JWT_SECRET = dashboard-jwt-secret-key-2024
EXCHANGE_RATE_API_KEY = cbb36a5aeba2aa9dbaa251e0
```

### Step 3: Redeploy
1. Click **Deployments**
2. Click the three dots on the latest deployment
3. Select **Redeploy**

---

## 2️⃣ For DigitalOcean / Custom Server

### Step 1: SSH into Your Server
```bash
ssh root@your_server_ip
```

### Step 2: Navigate to Backend Directory
```bash
cd /path/to/dashboard2.0/backend
```

### Step 3: Create/Edit .env File
```bash
nano .env
```

### Step 4: Copy All Variables
Copy the entire content from `backend/.env.production` and paste into the file.

### Step 5: Save and Exit
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### Step 6: Restart Backend Service
```bash
# If using PM2
pm2 restart dashboard-backend

# If using systemd
sudo systemctl restart dashboard-backend

# If running manually
npm start
```

---

## 3️⃣ For AWS / Heroku

### AWS EC2:
1. SSH into instance
2. Create `.env` file in backend directory
3. Add all variables from `.env.production`
4. Restart application

### Heroku:
1. Go to your app dashboard
2. Click **Settings**
3. Click **Reveal Config Vars**
4. Add all variables from `.env.production`
5. Redeploy

---

## 4️⃣ What Changed in Code

### ✅ Graceful Error Handling
- Backend no longer crashes with 500 errors if environment variables are missing
- Returns 503 (Service Unavailable) instead with clear error message
- Provides fallback values to prevent crashes

### ✅ Better Error Messages
- Development: Shows detailed error information
- Production: Shows generic error message for security

### ✅ Fallback Values
If environment variables are missing:
- `HOSTAWAY_AUTH_TOKEN` → `Bearer_NOT_SET`
- `TEABLE_BASE_URL` → `https://teable.namuve.com/api/table/NOT_SET/record`
- `TEABLE_BEARER_TOKEN` → `NOT_SET`

---

## 5️⃣ Verify Deployment

### Test Backend Health
```bash
curl https://your-backend-url/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Dashboard Backend API",
  "version": "1.0.0",
  "timestamp": "2025-12-05T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### Test Root Endpoint
```bash
curl https://your-backend-url/
```

Expected response:
```json
{
  "success": true,
  "message": "Dashboard Backend API is running! 🚀",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 6️⃣ Troubleshooting

### Still Getting 500 Errors?

**Check 1: Are environment variables set?**
```bash
# On your server, check if .env file exists
cat /path/to/backend/.env

# Or check Vercel dashboard for environment variables
```

**Check 2: Check server logs**
```bash
# PM2 logs
pm2 logs dashboard-backend

# Systemd logs
sudo journalctl -u dashboard-backend -f

# Docker logs
docker logs container-name
```

**Check 3: Verify tokens are correct**
- Make sure you copied the FULL token (including Bearer prefix if present)
- Check that tokens haven't expired
- Verify Teable URLs are correct

**Check 4: Test API endpoints**
```bash
# Test occupancy endpoint
curl https://your-backend-url/api/occupancy

# Test revenue endpoint
curl https://your-backend-url/api/dubai-revenue
```

---

## 7️⃣ Environment Variables Checklist

- [ ] `HOSTAWAY_AUTH_TOKEN` - Set
- [ ] `TEABLE_BASE_URL` - Set
- [ ] `TEABLE_BEARER_TOKEN` - Set
- [ ] `TEABLE_REVENUE_BEARER_TOKEN` - Set
- [ ] `TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN` - Set
- [ ] `TEABLE_ROOM_RESERVATIONS_BEARER_TOKEN` - Set
- [ ] `JWT_SECRET` - Set
- [ ] `EXCHANGE_RATE_API_KEY` - Set
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Set (usually 5000)

---

## 📝 Summary

**Before:** App works locally, 500 errors on server
**After:** App works everywhere with proper error handling

The code now:
✅ Handles missing environment variables gracefully
✅ Returns 503 instead of 500 for configuration issues
✅ Provides clear error messages
✅ Prevents crashes from missing tokens
