const axios = require('axios');
const express = require('express');
const router = express.Router();

// Teable Configuration - Dubai Listings
const TEABLE_BASE_URL = 'https://teable.namuve.com/api';
const TEABLE_TOKEN = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN || process.env.TEABLE_BEARER_TOKEN; // Dubai bearer token
const TABLE_ID = process.env.TEABLE_DUBAI_TABLE_ID || 'tblzeTQIYtfdLzAnNzC'; // Dubai rooms table ID

// Log token status on startup
console.log('🔐 Teable Token Status:');
console.log(`   - TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN: ${process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   - TEABLE_BEARER_TOKEN: ${process.env.TEABLE_BEARER_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   - Using token: ${TEABLE_TOKEN ? '✅ YES' : '❌ NO'}`);
console.log(`   - Table ID: ${TABLE_ID}`);

/**
 * Fetch all room records from Teable with pagination
 */
const fetchAllRoomRecords = async () => {
  try {
    let allRecords = [];
    let skip = 0;
    const take = 1000; // Fetch 1000 records per page
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `${TEABLE_BASE_URL}/table/${TABLE_ID}/record?take=${take}&skip=${skip}`,
        {
          headers: {
            'Authorization': `Bearer ${TEABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const records = response.data.records || [];
      allRecords = allRecords.concat(records);

      // If we got fewer records than requested, we've reached the end
      if (records.length < take) {
        hasMore = false;
      } else {
        skip += take;
      }
    }

    console.log(`📊 Fetched ${allRecords.length} total room records from Teable`);
    return allRecords;
  } catch (error) {
    console.error('❌ Error fetching room records from Teable:', error.message);
    return [];
  }
};

/**
 * Create a new room record in Teable
 */
const createRoomRecord = async (roomData) => {
  try {
    const requestBody = {
      records: [
        {
          fields: {
            "Report Period ": roomData.reportPeriod,
            "Occupancy Rate": roomData.occupancyRate,
            "Available": roomData.available,
            "Reserved": roomData.reserved,
            "Guest Name ": roomData.guestName,
            "Listing Name": roomData.listingName,
            "Reservation ID ": roomData.reservationId,
            "Check in Date": roomData.checkInTime
          }
        }
      ]
    };
    
    console.log('📤 Sending request to Teable:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(
      `${TEABLE_BASE_URL}/table/${TABLE_ID}/record`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${TEABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.records?.[0] || response.data;
  } catch (error) {
    console.error('❌ Error creating room record:', error.message);
    if (error.response) {
      console.error('❌ Teable Error Details:', error.response.data);
    }
    throw error;
  }
};

/**
 * Update an existing room record in Teable
 */
const updateRoomRecord = async (recordId, roomData) => {
  try {
    const response = await axios.patch(
      `${TEABLE_BASE_URL}/table/${TABLE_ID}/record`,
      {
        records: [
          {
            id: recordId,
            fields: {
              "Report Period ": roomData.reportPeriod,
              "Occupancy Rate": roomData.occupancyRate,
              "Available": roomData.available,
              "Reserved": roomData.reserved,
              "Guest Name ": roomData.guestName,
              "Listing Name": roomData.listingName,
              "Reservation ID ": roomData.reservationId,
              "Check in Date": roomData.checkInTime
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${TEABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.records?.[0] || response.data;
  } catch (error) {
    console.error('❌ Error updating room record:', error.message);
    if (error.response) {
      console.error('❌ Teable Error Details:', error.response.data);
    }
    throw error;
  }
};

/**
 * Delete a room record from Teable
 */
const deleteRoomRecord = async (recordId) => {
  try {
    await axios.delete(
      `${TEABLE_BASE_URL}/table/${TABLE_ID}/record/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${TEABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ Deleted room record: ${recordId}`);
  } catch (error) {
    console.error('❌ Error deleting room record:', error.message);
    throw error;
  }
};

/**
 * Sync room data to Teable
 * This runs in the background after returning cached data
 */
const syncRoomDataToTeable = async (occupancyData) => {
  try {
    console.log('🔄 Starting background sync of room data to Teable...');
    console.log('📊 Occupancy Data received:', JSON.stringify(occupancyData, null, 2));
    
    // Validate token
    if (!TEABLE_TOKEN) {
      console.error('❌ CRITICAL: Teable token is not configured!');
      console.error('   - TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN:', process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN ? 'SET' : 'NOT SET');
      console.error('   - TEABLE_BEARER_TOKEN:', process.env.TEABLE_BEARER_TOKEN ? 'SET' : 'NOT SET');
      throw new Error('TEABLE token is not set in environment variables. Please set TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN or TEABLE_BEARER_TOKEN');
    }
    
    console.log('✅ Teable token is configured and ready');
    console.log(`📊 Using table ID: ${TABLE_ID}`);
    
    const startTime = Date.now();

    // If no reserved rooms, fetch guest data from occupancy service
    let reservedRooms = occupancyData.reservedRooms || [];
    if (reservedRooms.length === 0) {
      console.log('📋 No reserved rooms in occupancyData, fetching from occupancy service...');
      try {
        const OccupancyService = require('../../services/occupancy');
        const occupancyService = new OccupancyService();
        const guestDataResult = await occupancyService.getTodayCheckinsDetails();
        if (guestDataResult.success && guestDataResult.data) {
          reservedRooms = guestDataResult.data.map(guest => ({
            guestName: guest.guestName,
            listingName: guest.listingName,
            reservationId: guest.reservationId,
            actualCheckInTime: guest.checkInDate,
            listingId: guest.listingId
          }));
          console.log(`✅ Fetched ${reservedRooms.length} guest records from occupancy service`);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch guest data from occupancy service:', err.message);
      }
    }

    // Fetch existing records from Teable
    const existingRecords = await fetchAllRoomRecords();
    
    // Create a map of existing records by reservation ID
    const existingMap = new Map();
    existingRecords.forEach(record => {
      const reservationId = record.fields["Reservation ID "];
      if (reservationId) {
        existingMap.set(reservationId.toString(), record);
      }
    });

    console.log(`📊 Found ${existingRecords.length} existing records in Teable`);
    console.log(`📊 Processing occupancy data from Hostaway`);
    
    // Calculate available rooms dynamically
    // Available = Total Dubai listings - Reserved rooms
    let totalDubaiListings = 0;
    let calculatedAvailable = 0;
    const totalReserved = occupancyData.totalReserved || reservedRooms.length || 0;
    
    // We'll calculate this after fetching listings below
    console.log(`📊 Occupancy Summary (before calculation):`, {
      occupancyRate: occupancyData.occupancyRate,
      totalAvailable: occupancyData.totalAvailable,
      totalReserved: totalReserved,
      totalRooms: occupancyData.totalRooms,
      reservedRoomsCount: occupancyData.reservedRooms?.length || 0
    });

    // Track statistics
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Get current date for report period
    const reportPeriod = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Process reserved rooms (with guest information) - Dubai listings only
    if (reservedRooms && reservedRooms.length > 0) {
      // Fetch all listings to identify Dubai properties dynamically
      console.log('🔍 Fetching all listings to identify Dubai properties...');
      let allListings = [];
      let listingOffset = 0;
      const listingLimit = 1000;
      let listingHasMore = true;
      const hostawayAuthToken = process.env.HOSTAWAY_AUTH_TOKEN;

      while (listingHasMore) {
        try {
          const listingsUrl = `https://api.hostaway.com/v1/listings?limit=${listingLimit}&offset=${listingOffset}`;
          const listingsResponse = await axios.get(listingsUrl, {
            headers: {
              Authorization: hostawayAuthToken,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });

          const listings = listingsResponse.data.result || [];
          allListings = allListings.concat(listings);

          if (listings.length < listingLimit) {
            listingHasMore = false;
          } else {
            listingOffset += listingLimit;
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch listings, will use all reservations:', err.message);
          listingHasMore = false;
        }
      }

      // Filter for Dubai listings dynamically
      console.log(`🔍 Total listings fetched: ${allListings.length}`);
      
      const dubaiListingIds = allListings
        .filter(listing => {
          const city = listing.city || listing.location || listing.address || '';
          const cityLower = city.toLowerCase();
          const isDubai = cityLower.includes('dubai') || cityLower.includes('uae');
          if (isDubai) {
            console.log(`   ✅ Dubai: ${listing.id} - ${listing.name} (${city})`);
          }
          return isDubai;
        })
        .map(listing => listing.id);

      console.log(`✅ Found ${dubaiListingIds.length} Dubai listings dynamically`);
      
      // If no Dubai listings found, use hardcoded list as fallback
      const finalDubaiListingIds = dubaiListingIds.length > 0 ? dubaiListingIds : 
        [288676, 288677, 288678, 288679, 288681, 288683, 288684, 288690, 288726, 305327, 306543, 307143, 309909, 383744, 389366, 395345, 400763];
      
      console.log(`📍 Using ${finalDubaiListingIds.length} Dubai listing IDs for filtering`);
      
      // Calculate available rooms dynamically
      // Available = Total Dubai listings - Reserved rooms
      totalDubaiListings = finalDubaiListingIds.length;
      calculatedAvailable = Math.max(0, totalDubaiListings - totalReserved);
      const calculatedOccupancyRate = totalDubaiListings > 0 ? ((totalReserved / totalDubaiListings) * 100).toFixed(2) : 0;
      
      console.log(`📊 CALCULATED OCCUPANCY (from listings):`, {
        totalDubaiListings: totalDubaiListings,
        totalReserved: totalReserved,
        calculatedAvailable: calculatedAvailable,
        calculatedOccupancyRate: calculatedOccupancyRate + '%'
      });
      
      // Filter for Dubai listings only
      const dubaiListings = occupancyData.reservedRooms.filter(room => {
        const isDubai = finalDubaiListingIds.includes(room.listingId);
        console.log(`   ${isDubai ? '✅' : '❌'} Listing ${room.listingId} (${room.listingName}): ${isDubai ? 'INCLUDED' : 'EXCLUDED'}`);
        return isDubai;
      });
      
      console.log(`📍 Processing ${dubaiListings.length} Dubai reserved rooms out of ${occupancyData.reservedRooms.length} total`);
      
      // Create a map of listing IDs to internal names for reference
      const listingNameMap = new Map();
      allListings.forEach(listing => {
        const internalName = listing.internalListingName || listing.title || listing.name || `Unit ${listing.id}`;
        listingNameMap.set(listing.id, internalName);
      });
      
      for (const room of dubaiListings) {
        let roomData = null; // Declare outside try block
        try {
          const reservationId = room.reservationId?.toString() || '';
          if (!reservationId) {
            console.log('⚠️ Skipping room without reservation ID');
            continue;
          }

          const existingRecord = existingMap.get(reservationId);
          
          // Mark this record as processed
          if (existingRecord) {
            existingMap.delete(reservationId);
          }

          // Use the correct listing name from the map
          const correctListingName = listingNameMap.get(room.listingId) || room.listingName || `Unit ${room.listingId}`;

          roomData = {
            reportPeriod: reportPeriod,
            occupancyRate: String(calculatedOccupancyRate || '0'),  // Use calculated occupancy rate
            available: String(calculatedAvailable || '0'),  // Use calculated available rooms
            reserved: String(totalReserved || '0'),  // Show total reserved rooms
            guestName: String(room.guestName || 'N/A'),
            listingName: String(correctListingName),
            reservationId: String(reservationId),
            checkInTime: String(room.actualCheckInTime || 'N/A')
          };

          console.log(`📤 Posting guest data to Teable:`, {
            guestName: roomData.guestName,
            listingName: roomData.listingName,
            reservationId: roomData.reservationId,
            checkInTime: roomData.checkInTime
          });

          if (existingRecord) {
            // Always PATCH existing record to update all fields (including new ones)
            await updateRoomRecord(existingRecord.id, roomData);
            updated++;
            console.log(`✅ Updated record for reservation ${reservationId} with guest: ${roomData.guestName}`);
          } else {
            // POST new record
            await createRoomRecord(roomData);
            created++;
            console.log(`✅ Created new record for reservation ${reservationId} with guest: ${roomData.guestName}`);
          }
        } catch (error) {
          console.error(`❌ Error processing room ${room.reservationId}:`, error.message);
          if (error.response) {
            console.error(`❌ Status: ${error.response.status}`);
            console.error(`❌ Teable Error Details:`, JSON.stringify(error.response.data, null, 2));
          }
          console.error(`❌ Room Data Sent:`, JSON.stringify(roomData, null, 2));
          errors++;
        }
      }
    }

    // Delete records that no longer exist in Hostaway
    let deleted = 0;
    for (const [reservationId, record] of existingMap) {
      try {
        await deleteRoomRecord(record.id);
        console.log(`🗑️ Deleted old room record for reservation ${reservationId}`);
        deleted++;
      } catch (error) {
        console.error(`❌ Error deleting record ${reservationId}:`, error.message);
      }
    }

    const syncTime = Date.now() - startTime;
    console.log(`✅ Background room sync completed in ${syncTime}ms`);
    console.log(`📊 Sync Statistics:`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Unchanged: ${unchanged}`);
    console.log(`   - Deleted: ${deleted}`);
    console.log(`   - Errors: ${errors}`);

    return {
      success: true,
      created,
      updated,
      unchanged,
      deleted,
      errors,
      syncTime
    };
  } catch (error) {
    console.error('❌ Error syncing room data to Teable:', error.message);
    throw error;
  }
};

/**
 * Get room data - returns cached Teable data immediately, then syncs in background
 */
const getRoomDataFast = async (req, res) => {
  try {
    console.log('⚡ Fast room data request received');
    const startTime = Date.now();

    // 1. Immediately return cached data from Teable
    const cachedRecords = await fetchAllRoomRecords();
    const fetchTime = Date.now() - startTime;
    
    console.log(`✅ Returned ${cachedRecords.length} cached records in ${fetchTime}ms`);
    
    res.json({
      success: true,
      data: cachedRecords,
      cached: true,
      fetchTime,
      message: 'Data returned from cache, syncing in background'
    });

    // 2. Sync in background (don't await)
    // This would be triggered by your occupancy endpoint
    // syncRoomDataToTeable(occupancyData).catch(err => {
    //   console.error('Background sync failed:', err);
    // });

  } catch (error) {
    console.error('❌ Error fetching room data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Manual sync endpoint - forces immediate sync
 */
const syncRoomDataManual = async (req, res) => {
  try {
    console.log('🔄 Manual room sync requested');
    const { occupancyData } = req.body;

    if (!occupancyData) {
      return res.status(400).json({
        success: false,
        error: 'occupancyData is required'
      });
    }

    const result = await syncRoomDataToTeable(occupancyData);
    
    res.json({
      success: true,
      ...result,
      message: 'Manual sync completed successfully'
    });
  } catch (error) {
    console.error('❌ Error in manual sync:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Test endpoint - Check connection and create sample record
 */
const testConnection = async (req, res) => {
  try {
    console.log('🧪 Testing Teable connection...');
    console.log('📍 Token:', TEABLE_TOKEN ? 'Set ✓' : 'Missing ✗');
    console.log('📍 Table ID:', TABLE_ID);
    
    // Test 1: Fetch existing records
    const records = await fetchAllRoomRecords();
    console.log(`✅ Successfully fetched ${records.length} records`);
    
    // Test 2: Create a sample record
    const sampleData = {
      reportPeriod: new Date().toISOString().split('T')[0],
      occupancyRate: '75',
      available: '10',
      reserved: '5',
      guestName: 'Test Guest',
      listingName: 'Test Room',
      reservationId: 'TEST-' + Date.now(),
      checkInTime: new Date().toISOString()
    };
    
    console.log('📝 Creating test record...');
    const newRecord = await createRoomRecord(sampleData);
    console.log('✅ Test record created:', newRecord.id);
    
    res.json({
      success: true,
      message: 'Connection test successful',
      existingRecords: records.length,
      testRecordId: newRecord.id,
      token: TEABLE_TOKEN ? 'Set' : 'Missing',
      tableId: TABLE_ID
    });
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('❌ Full error:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
};

// Define API routes
// GET /api/rooms-teable/data - Get cached room data
router.get('/data', getRoomDataFast);

// POST /api/rooms-teable/sync - Manual sync
router.post('/sync', syncRoomDataManual);

// GET /api/rooms-teable/test - Test connection
router.get('/test', testConnection);

module.exports = router;
