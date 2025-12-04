# 🔧 DYNAMIC CLEANING STATUS OVERRIDES

## Overview

A dynamic system to manage cleaning status overrides without hardcoding values. Allows real-time updates to correct inaccurate Hostaway cleaning status data.

## Architecture

### Backend API Endpoints

#### 1. GET /api/cleaning-status-overrides
Get all cleaning status overrides

**Response:**
```json
{
  "success": true,
  "data": {
    "451414": {
      "listingId": 451414,
      "hwStatus": "Not Clean",
      "hkStatus": "Not Clean",
      "cleannessStatus": 2,
      "statusText": "Not Clean ❌",
      "reason": "Manual override",
      "createdAt": "2025-12-02T17:00:00.000Z",
      "updatedAt": "2025-12-02T17:00:00.000Z"
    }
  },
  "count": 1
}
```

#### 2. POST /api/cleaning-status-overrides
Add a new cleaning status override

**Request Body:**
```json
{
  "listingId": 451414,
  "hwStatus": "Not Clean",
  "hkStatus": "Not Clean",
  "reason": "Actually not clean - needs cleaning"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": 451414,
    "hwStatus": "Not Clean",
    "hkStatus": "Not Clean",
    "cleannessStatus": 2,
    "statusText": "Not Clean ❌",
    "reason": "Actually not clean - needs cleaning",
    "createdAt": "2025-12-02T17:00:00.000Z",
    "updatedAt": "2025-12-02T17:00:00.000Z"
  },
  "message": "Cleaning status override added for listing 451414"
}
```

#### 3. PUT /api/cleaning-status-overrides/:listingId
Update an existing cleaning status override

**Request Body:**
```json
{
  "hwStatus": "Clean",
  "hkStatus": "Clean",
  "reason": "Updated - now clean"
}
```

#### 4. DELETE /api/cleaning-status-overrides/:listingId
Remove a cleaning status override

#### 5. GET /api/cleaning-status-overrides/:listingId
Get a specific cleaning status override

### Frontend Integration

#### Fetch Overrides
```javascript
const fetchCleaningStatusOverrides = async () => {
  const response = await fetch('/api/cleaning-status-overrides', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  setCleaningStatusOverrides(result.data);
};
```

#### Apply Overrides
When merging cleaning status with listings, check if an override exists:
```javascript
const override = cleaningStatusOverrides[cleaningStatus.listingId];
if (override) {
  // Use override values instead of Hostaway values
  hwStatus = override.hwStatus;
  hkStatus = override.hkStatus;
}
```

## Usage Examples

### Add Override for Listing 451414 (2405 Address Opera)

```bash
curl -X POST http://localhost:5000/api/cleaning-status-overrides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "listingId": 451414,
    "hwStatus": "Not Clean",
    "hkStatus": "Not Clean",
    "reason": "2405 Address Opera - Actually not clean"
  }'
```

### Update Override for Listing 458238 (3607 VIDA Dubai Mall)

```bash
curl -X PUT http://localhost:5000/api/cleaning-status-overrides/458238 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "hwStatus": "Clean",
    "hkStatus": "Clean",
    "reason": "3607 VIDA Dubai Mall - Now clean"
  }'
```

### Remove Override

```bash
curl -X DELETE http://localhost:5000/api/cleaning-status-overrides/451414 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Files Modified

### Backend
- **Created:** `/backend/api/cleaningStatusOverrides.js` - API routes for managing overrides
- **Modified:** `/backend/src/app.js` - Registered cleaning status overrides routes

### Frontend
- **Modified:** `/frontend/src/layouts/Rooms/index.js` - Added state and fetch logic for overrides
- **Modified:** `/frontend/src/config/api.js` - Added API endpoints for overrides

## Current Overrides

### Listing 451414 (2405 Address Opera)
- **Hostaway Status:** Clean ✅
- **Actual Status:** Not Clean ❌
- **Override:** Set to "Not Clean"

### Listing 458238 (3607 VIDA Dubai Mall)
- **Hostaway Status:** Not Clean ❌
- **Actual Status:** Clean ✅
- **Override:** Set to "Clean"

### Listing ??? (2808 29 Boulevard)
- **Hostaway Status:** Clean ✅
- **Actual Status:** Not Clean ❌
- **Override:** Pending - Need listing ID

## How to Add More Overrides

1. Identify the listing ID from backend logs or API response
2. Call POST endpoint with listing ID and correct status
3. Frontend will automatically fetch and apply the override
4. No code changes needed - fully dynamic!

## Benefits

✅ **No Hardcoding** - Overrides stored in backend
✅ **Dynamic Updates** - Change status without redeploying
✅ **Audit Trail** - Track when overrides were created/updated
✅ **Easy Management** - Simple REST API
✅ **Real-time** - Frontend fetches overrides on load
✅ **Scalable** - Can handle unlimited overrides

## Future Enhancements

1. **Database Persistence** - Store overrides in MongoDB/PostgreSQL instead of memory
2. **Admin UI** - Create UI to manage overrides without API calls
3. **Bulk Operations** - Add/remove multiple overrides at once
4. **Expiration** - Set override expiration dates
5. **Notifications** - Alert when override is applied
6. **Audit Logs** - Track all override changes with user info
