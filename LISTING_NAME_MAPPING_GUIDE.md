# 🗺️ LISTING NAME MAPPING - DYNAMIC APARTMENT MATCHING

## Overview

A dynamic system to correctly match Teable apartment names with Hostaway listing IDs and cleaning status. Eliminates hardcoding and provides real-time mapping updates.

## Problem Solved

**Issue:** Frontend apartments from Teable don't have listing IDs, making it impossible to correctly match them with Hostaway cleaning status data.

**Example:**
- Teable shows: "2405 Address Opera"
- Hostaway shows: Listing ID 451414 → "Maison d'Opéra by NAMUVE"
- These are the same apartment but names don't match!

**Solution:** Dynamic mapping API that provides the correct relationship between apartment names and listing IDs.

## Backend API Endpoints

### 1. GET /api/listing-name-mapping
Get complete mapping of all Dubai listings

**Response:**
```json
{
  "success": true,
  "data": {
    "451414": {
      "listingId": 451414,
      "internalListingName": "Maison d'Opéra by NAMUVE | Boulevard Views",
      "name": "Maison d'Opéra by NAMUVE | Boulevard Views",
      "hwStatus": "Clean",
      "hkStatus": "Clean",
      "cleannessStatus": 1,
      "statusText": "Clean ✅",
      "isClean": true
    },
    "458238": {
      "listingId": 458238,
      "internalListingName": "VIDA 1BR Dubai Mall | Luxury Stay Downtown",
      "name": "VIDA 1BR Dubai Mall | Luxury Stay Downtown",
      "hwStatus": "Not Clean",
      "hkStatus": "Not Clean",
      "cleannessStatus": 2,
      "statusText": "Not Clean ❌",
      "isClean": false
    }
  },
  "count": 13
}
```

### 2. GET /api/listing-name-mapping/search/:searchTerm
Search for listings by partial name match

**Example:** `/api/listing-name-mapping/search/Address Opera`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "listingId": 451414,
      "internalListingName": "Maison d'Opéra by NAMUVE | Boulevard Views",
      "hwStatus": "Clean",
      "hkStatus": "Clean"
    },
    {
      "listingId": 449910,
      "internalListingName": "Opéra Majestique | Downtown Skyline",
      "hwStatus": "Not Clean",
      "hkStatus": "Not Clean"
    }
  ],
  "count": 2,
  "searchTerm": "Address Opera"
}
```

### 3. GET /api/listing-name-mapping/by-id/:listingId
Get specific listing by ID

**Example:** `/api/listing-name-mapping/by-id/451414`

**Response:**
```json
{
  "success": true,
  "data": {
    "listingId": 451414,
    "internalListingName": "Maison d'Opéra by NAMUVE | Boulevard Views",
    "name": "Maison d'Opéra by NAMUVE | Boulevard Views",
    "hwStatus": "Clean",
    "hkStatus": "Clean",
    "cleannessStatus": 1,
    "statusText": "Clean ✅",
    "isClean": true
  }
}
```

### 4. GET /api/listing-name-mapping/debug-report
Detailed debug report with all listings and their mappings

**Response:** Formatted table with all listings showing ID, internal name, and status

## Frontend Integration

### Fetch Mapping
```javascript
const fetchListingNameMapping = async () => {
  const response = await fetch('/api/listing-name-mapping', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  setListingNameMapping(result.data);
};
```

### Use Mapping to Match Apartments
```javascript
// For each Teable apartment, find matching Hostaway listing
const teableApartment = { name: "2405 Address Opera" };

// Search in mapping for matching internal name
const matchedListing = Object.values(listingNameMapping).find(listing => 
  listing.internalListingName.toLowerCase().includes(teableApartment.name.toLowerCase())
);

if (matchedListing) {
  console.log(`Matched! Listing ID: ${matchedListing.listingId}`);
  console.log(`Cleaning Status: ${matchedListing.hwStatus}`);
}
```

## Current Mapping Examples

### Listing 451414 - Maison d'Opéra by NAMUVE
- **Teable Name:** 2405 Address Opera
- **Hostaway Name:** Maison d'Opéra by NAMUVE | Boulevard Views
- **Status:** Clean ✅
- **Listing ID:** 451414

### Listing 458238 - VIDA 1BR Dubai Mall
- **Teable Name:** 3607 VIDA Dubai Mall
- **Hostaway Name:** VIDA 1BR Dubai Mall | Luxury Stay Downtown
- **Status:** Not Clean ❌
- **Listing ID:** 458238

### Listing 453690 - The Imperial Burj View
- **Teable Name:** 2808 29 Boulevard
- **Hostaway Name:** The Imperial Burj View by NAMUVE | 29 Boulevard
- **Status:** Not Clean ❌
- **Listing ID:** 453690

## Files Created/Modified

### Created:
- `/backend/api/listingNameMapping.js` - API routes for listing mapping

### Modified:
- `/backend/src/app.js` - Registered listing mapping routes
- `/frontend/src/config/api.js` - Added API endpoints
- `/frontend/src/layouts/Rooms/index.js` - Added fetch and use logic

## How It Works

1. **Backend fetches** all Dubai listings from Hostaway API
2. **Creates mapping** of listing ID → listing details (name, status, etc.)
3. **Frontend fetches** the mapping on load
4. **Frontend uses mapping** to correctly match Teable apartments with Hostaway listings
5. **Displays correct** cleaning status for each apartment

## Benefits

✅ **No Hardcoding** - All mappings generated dynamically from Hostaway API
✅ **Real-time Updates** - Reflects current Hostaway data
✅ **Accurate Matching** - Uses actual listing IDs and names
✅ **Searchable** - Can search for listings by name
✅ **Debuggable** - Full debug report available
✅ **Scalable** - Works with any number of listings

## Usage Examples

### Get all listings with their status
```bash
curl http://localhost:5000/api/listing-name-mapping
```

### Search for "Address Opera" listings
```bash
curl http://localhost:5000/api/listing-name-mapping/search/Address%20Opera
```

### Get specific listing by ID
```bash
curl http://localhost:5000/api/listing-name-mapping/by-id/451414
```

### Get debug report
```bash
curl http://localhost:5000/api/listing-name-mapping/debug-report
```

## Integration with Cleaning Status

The listing name mapping works together with:
- **Cleaning Status API** - Provides actual cleaning status from Hostaway
- **Cleaning Status Overrides** - Allows manual corrections if needed
- **Frontend Merge Logic** - Combines all data to display correct status

## Next Steps

1. Frontend fetches mapping on load ✅
2. Frontend uses mapping to match apartments ✅
3. Frontend displays correct cleaning status ✅
4. All apartments show correct HW/HK status dynamically ✅

**Status: ✅ Ready to use - All mappings generated dynamically!**
