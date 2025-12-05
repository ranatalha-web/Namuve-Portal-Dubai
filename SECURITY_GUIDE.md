# Security Guide - API Keys & Sensitive Data Protection

## ✅ What's Been Fixed

### 1. **Sensitive Data Sanitization**
- Created `/backend/src/utils/sanitizer.js` - Utility to hide sensitive data
- Automatically hides:
  - Bearer tokens
  - JWT tokens
  - API keys
  - Passwords
  - Authorization headers
  - Teable tokens
  - Any token-like strings (40+ characters)

### 2. **Error Logging Protection**
- All error logs now use `getSafeError()` function
- Sensitive data is automatically hidden in error messages
- API keys won't appear in server logs or error responses

### 3. **Configuration Logging**
- Config is only logged in development mode
- Sensitive values shown as `[HIDDEN]` in logs
- Production mode doesn't log configuration

---

## 🔒 How It Works

### Sanitizer Function
```javascript
const { getSafeError } = require('./utils/sanitizer');

// Before: Logs full error with tokens exposed
console.error('Error:', error);

// After: Logs sanitized error
console.error('Error:', getSafeError(error));
```

### What Gets Hidden
- `Bearer eyJ0eXAi...` → `Bearer [HIDDEN]`
- `teable_accSgExX4...` → `teable_[HIDDEN]`
- Long alphanumeric strings → `[HIDDEN]`
- JWT tokens → `[JWT_HIDDEN]`

---

## 📋 Implementation Details

### Files Modified:
1. **`/backend/src/utils/sanitizer.js`** (NEW)
   - `sanitizeObject()` - Sanitizes objects recursively
   - `sanitizeString()` - Sanitizes strings with regex patterns
   - `getSafeError()` - Creates safe error objects for logging
   - `isSensitiveKey()` - Checks if a key is sensitive

2. **`/backend/src/services/authService.js`**
   - Updated error logging to use `getSafeError()`
   - No more raw error responses with tokens

3. **`/backend/src/app.js`**
   - Updated global error handler to use `getSafeError()`
   - All errors logged safely

---

## 🚀 Best Practices

### ✅ DO:
```javascript
// Good: Use sanitizer for logging
const { getSafeError } = require('./utils/sanitizer');
console.error('API Error:', getSafeError(error));

// Good: Hide tokens in responses
res.json({
  success: false,
  error: 'Authentication failed',
  // Don't include: token, apiKey, etc.
});
```

### ❌ DON'T:
```javascript
// Bad: Logging raw errors with tokens
console.error('Error:', error);
console.error('Full error:', JSON.stringify(error));

// Bad: Exposing tokens in responses
res.json({
  success: false,
  error: error.message,
  token: 'Bearer eyJ0eXAi...' // EXPOSED!
});
```

---

## 🔍 Verification

### Check Logs
```bash
# Start backend with logging enabled
ENABLE_LOGS=true npm start

# Look for sanitized output:
# ❌ ERROR: Teable API Error: { message: 'Unauthorized', response: { status: 401, data: { error: '[HIDDEN]' } } }
```

### Test Error Response
```bash
# Call an endpoint that fails
curl https://your-backend/api/occupancy

# Response should NOT contain:
# - Bearer tokens
# - API keys
# - Teable tokens
# - JWT tokens
```

---

## 🛡️ Security Checklist

- [x] API keys hidden from logs
- [x] Tokens hidden from error responses
- [x] Passwords never logged
- [x] Authorization headers sanitized
- [x] Error messages safe for production
- [x] Configuration not exposed in production
- [x] Sensitive keys automatically detected
- [x] Recursive sanitization for nested objects

---

## 📊 Sensitive Keys Detected

The sanitizer automatically detects and hides these keys:
- `authorization`
- `bearer`
- `token`
- `api_key` / `apikey`
- `secret`
- `password` / `pwd`
- `auth`
- `access_token`
- `refresh_token`
- `jwt`
- `x-api-key`
- `x-auth-token`
- `teable`
- `hostaway`
- `bearer_token`

---

## 🔐 Environment Variables

### Never Expose These:
```
HOSTAWAY_AUTH_TOKEN=Bearer eyJ0eXAi...
TEABLE_BEARER_TOKEN=teable_accSgExX4...
JWT_SECRET=your-secret-key
EXCHANGE_RATE_API_KEY=cbb36a5aeba2aa9dbaa251e0
```

### Safe to Expose:
```
NODE_ENV=production
PORT=5000
TIMEZONE_OFFSET=5
```

---

## 📞 Support

If you see sensitive data in logs or error responses:
1. Check that `getSafeError()` is being used
2. Verify the sanitizer is imported correctly
3. Check if new sensitive keys need to be added to `SENSITIVE_KEYS` array
4. Update the sanitizer if new patterns are found

---

## 🚀 Deployment Notes

- ✅ Sanitizer works in both development and production
- ✅ No performance impact (minimal overhead)
- ✅ All errors are logged safely
- ✅ Production mode shows generic error messages
- ✅ Development mode shows detailed (but sanitized) errors

---

**Last Updated:** December 5, 2025
**Status:** ✅ Implemented and Active
