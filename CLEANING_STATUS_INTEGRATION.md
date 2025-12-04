# Hostaway Cleaning Status Integration Guide

## Overview
This guide explains how to use the new Hostaway Cleaning Status service to fetch apartment cleaning status dynamically from Hostaway API.

**Key Update:** Now uses the direct listing endpoint with `cleannessStatus` field:
- `cleannessStatus: 1` = Clean ✅
- `cleannessStatus: 2` = Not Clean ❌

## Files Created

### 1. Backend Service
**File:** `/backend/services/hostawayCleaningStatus.js`

This service provides methods to fetch cleaning status from Hostaway API:

- `fetchListingsWithCleaningStatus()` - Fetch all listings with cleaning status
- `fetchDubaiListingsCleaningStatus()` - Fetch Dubai listings only
- `fetchListingCleaningStatus(listingId)` - Fetch specific listing
- `fetchMultipleListingsCleaningStatus(listingIds)` - Fetch multiple listings
- `getCleaningStatusSummary()` - Get dashboard summary
- `isClean(cleaningStatus, hwStatus, hkStatus)` - Determine if apartment is clean

### 2. Backend API Routes
**File:** `/backend/api/hostawayCleaningStatus.js`

Provides REST API endpoints:

- `GET /api/hostaway/cleaning-status/all` - All listings
- `GET /api/hostaway/cleaning-status/dubai` - Dubai listings only
- `GET /api/hostaway/cleaning-status/listing/:id` - Specific listing
- `POST /api/hostaway/cleaning-status/multiple` - Multiple listings
- `GET /api/hostaway/cleaning-status/summary` - Dashboard summary

## Integration Steps

### Step 1: Register Routes in Backend

Add to `/backend/src/app.js` (around line 200):

```javascript
// Import Hostaway Cleaning Status routes
const hostawayCleaningStatusRoutes = require("../api/hostawayCleaningStatus");

// ... existing code ...

// Register routes (around line 280, after other routes)
app.use("/api/hostaway/cleaning-status", hostawayCleaningStatusRoutes);
```

### Step 2: Add API Endpoints to Frontend Config

Add to `/frontend/src/config/api.js`:

```javascript
// Hostaway Cleaning Status
HOSTAWAY_CLEANING_STATUS_ALL: `${API_BASE_URL}/api/hostaway/cleaning-status/all`,
HOSTAWAY_CLEANING_STATUS_DUBAI: `${API_BASE_URL}/api/hostaway/cleaning-status/dubai`,
HOSTAWAY_CLEANING_STATUS_LISTING: `${API_BASE_URL}/api/hostaway/cleaning-status/listing`,
HOSTAWAY_CLEANING_STATUS_MULTIPLE: `${API_BASE_URL}/api/hostaway/cleaning-status/multiple`,
HOSTAWAY_CLEANING_STATUS_SUMMARY: `${API_BASE_URL}/api/hostaway/cleaning-status/summary`,
```

### Step 3: Use in Frontend (Room.js)

Example usage in `/frontend/src/layouts/Rooms/index.js`:

```javascript
// Fetch cleaning status for all Dubai apartments
const fetchCleaningStatus = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.HOSTAWAY_CLEANING_STATUS_DUBAI, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      const cleaningStatusMap = new Map();
      
      result.data.forEach(listing => {
        cleaningStatusMap.set(listing.id, {
          cleaningStatus: listing.cleaningStatus,
          hwStatus: listing.hwStatus,
          hkStatus: listing.hkStatus,
          isClean: listing.cleaningStatus?.toLowerCase().includes('clean')
        });
      });
      
      setCleaningStatusMap(cleaningStatusMap);
      console.log('✅ Cleaning status fetched:', cleaningStatusMap.size, 'listings');
    }
  } catch (error) {
    console.error('❌ Error fetching cleaning status:', error);
  }
};

// Call in useEffect
useEffect(() => {
  if (isAuthenticated) {
    fetchCleaningStatus();
  }
}, [isAuthenticated]);
```

## API Response Examples

### Get All Dubai Listings Cleaning Status

**Request:**
```bash
GET /api/hostaway/cleaning-status/dubai
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched 55 Dubai listings with cleaning status",
  "data": [
    {
      "id": 305055,
      "name": "Apartment 1BR Dubai",
      "city": "Dubai",
      "country": "UAE",
      "cleaningStatus": "Clean",
      "hwStatus": "Clean",
      "hkStatus": "Ready",
      "lastCleaningDate": "2025-11-28",
      "nextCleaningDate": "2025-11-29",
      "bedroomsNumber": 1,
      "bathroomsNumber": 1,
      "maxGuests": 2
    },
    // ... more listings
  ],
  "count": 55
}
```

### Get Specific Listing Cleaning Status

**Request:**
```bash
GET /api/hostaway/cleaning-status/listing/305055
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched cleaning status for listing 305055",
  "data": {
    "id": 305055,
    "name": "Apartment 1BR Dubai",
    "city": "Dubai",
    "country": "UAE",
    "cleannessStatus": 1,
    "cleannessStatusText": "Clean",
    "isClean": true,
    "bedroomsNumber": 1,
    "bathroomsNumber": 1,
    "maxGuests": 2
  },
  "cleannessStatusMapping": {
    "1": "Clean",
    "2": "Not Clean"
  }
}
```

### Get Multiple Listings Cleaning Status

**Request:**
```bash
POST /api/hostaway/cleaning-status/multiple
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "listingIds": [305055, 309909, 323227]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched cleaning status for 3 listings",
  "data": [
    {
      "id": 305055,
      "name": "Apartment 1BR Dubai",
      "cleaningStatus": "Clean",
      "hwStatus": "Clean",
      "hkStatus": "Ready",
      "isClean": true
    },
    // ... more listings
  ],
  "count": 3
}
```

### Get Cleaning Status Summary

**Request:**
```bash
GET /api/hostaway/cleaning-status/summary
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched cleaning status summary",
  "data": {
    "totalListings": 55,
    "cleanListings": 48,
    "notCleanListings": 5,
    "unknownStatus": 2,
    "cleanPercentage": 87
  },
  "listings": [
    // ... all listings with status
  ]
}
```

## Cleaning Status Fields

From Hostaway API endpoint `https://api.hostaway.com/v1/listings/{listingId}`, the service fetches:

| Field | Description | Values |
|-------|-------------|--------|
| `cleannessStatus` | **PRIMARY** - Apartment cleaning status | `1` = Clean ✅, `2` = Not Clean ❌ |
| `id` | Listing ID | Integer |
| `name` | Listing name | String |
| `city` | City location | String |
| `country` | Country | String |
| `bedroomsNumber` | Number of bedrooms | Integer |
| `bathroomsNumber` | Number of bathrooms | Integer |
| `maxGuests` | Maximum guests | Integer |

## Clean Status Determination

The service uses the `cleannessStatus` field from Hostaway API:

**Mapping:**
```javascript
cleannessStatus === 1  → isClean = true  (✅ Clean)
cleannessStatus === 2  → isClean = false (❌ Not Clean)
other values          → isClean = true  (default to clean)
```

**Helper Methods:**
- `mapCleannessStatus(cleannessStatus)` - Convert numeric to boolean
- `getCleannessStatusText(cleannessStatus)` - Get human-readable text ("Clean" or "Not Clean")

## Usage in Room.js

### Display Cleaning Status in Table

```javascript
// In your room listing table
{
  headerName: "Cleaning Status",
  field: "cleaningStatus",
  width: 150,
  renderCell: (params) => {
    const status = cleaningStatusMap.get(params.row.id);
    if (!status) return "Unknown";
    
    return (
      <Chip
        label={status.isClean ? "Clean" : "Not Clean"}
        color={status.isClean ? "success" : "warning"}
        variant="outlined"
      />
    );
  }
}
```

### Filter by Cleaning Status

```javascript
const getCleanApartments = () => {
  return listings.filter(listing => {
    const status = cleaningStatusMap.get(listing.id);
    return status?.isClean === true;
  });
};

const getNotCleanApartments = () => {
  return listings.filter(listing => {
    const status = cleaningStatusMap.get(listing.id);
    return status?.isClean === false;
  });
};
```

## Error Handling

All endpoints return error responses with proper HTTP status codes:

```json
{
  "success": false,
  "message": "Failed to fetch listings cleaning status",
  "error": "HOSTAWAY_AUTH_TOKEN not configured"
}
```

## Performance Notes

- **Pagination:** Service handles pagination automatically (1000 items per request)
- **Batch Processing:** Multiple listings fetched with max 5 concurrent requests
- **Caching:** Consider caching results for 5-10 minutes to reduce API calls
- **Timeout:** 60 seconds for listing fetches, 30 seconds for single listings

## Testing

### Test with curl

```bash
# Get Dubai listings
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/hostaway/cleaning-status/dubai

# Get specific listing
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/hostaway/cleaning-status/listing/305055

# Get summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/hostaway/cleaning-status/summary
```

## Troubleshooting

### Issue: "HOSTAWAY_AUTH_TOKEN not configured"
**Solution:** Ensure `HOSTAWAY_AUTH_TOKEN` is set in `.env` file

### Issue: Empty listings returned
**Solution:** Check that Dubai listings exist in Hostaway account with city/location containing "Dubai" or "UAE"

### Issue: Slow response times
**Solution:** 
- Reduce number of listings fetched
- Implement caching
- Use `/listing/:id` for specific apartments instead of fetching all

## Next Steps

1. ✅ Created service file: `/backend/services/hostawayCleaningStatus.js`
2. ✅ Created API routes: `/backend/api/hostawayCleaningStatus.js`
3. ⏳ Register routes in `/backend/src/app.js`
4. ⏳ Add endpoints to `/frontend/src/config/api.js`
5. ⏳ Implement in `/frontend/src/layouts/Rooms/index.js`
6. ⏳ Display cleaning status in room cards/tables
7. ⏳ Add filter by cleaning status

## Support

For issues or questions, check:
- Backend logs: `ENABLE_LOGS=true npm start`
- Hostaway API documentation: https://api.hostaway.com/docs
- Service implementation: `/backend/services/hostawayCleaningStatus.js`
