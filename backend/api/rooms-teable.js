const axios = require('axios');
const express = require('express');
const router = express.Router();

// Teable Configuration
const TEABLE_BASE_URL = 'https://teable.namuve.com/api';
const TEABLE_TOKEN = process.env.TEABLE_BEARER_TOKEN; // From .env file
const TABLE_ID = 'tblqQ0uy0lceDPDGvMr'; // Your table ID

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
            "Check in Time": roomData.checkInTime
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
              "Check in Time": roomData.checkInTime
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
      throw new Error('TEABLE_BEARER_TOKEN is not set in environment variables');
    }
    
    const startTime = Date.now();

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

    // Track statistics
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Get current date for report period
    const reportPeriod = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Process reserved rooms (with guest information)
    if (occupancyData.reservedRooms && occupancyData.reservedRooms.length > 0) {
      for (const room of occupancyData.reservedRooms) {
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

          roomData = {
            reportPeriod: reportPeriod,
            occupancyRate: String(occupancyData.occupancyRate || '0'),
            available: String(occupancyData.totalAvailable || '0'),
            reserved: String(occupancyData.totalReserved || '0'),
            guestName: String(room.guestName || 'N/A'),
            listingName: String(room.listingName || 'N/A'),
            reservationId: String(reservationId),
            checkInTime: String(room.actualCheckInTime || 'N/A')
          };

          if (existingRecord) {
            // Always PATCH existing record to update all fields (including new ones)
            await updateRoomRecord(existingRecord.id, roomData);
            updated++;
            console.log(`✅ Updated record for reservation ${reservationId}`);
          } else {
            // POST new record
            await createRoomRecord(roomData);
            created++;
            console.log(`✅ Created new record for reservation ${reservationId}`);
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
