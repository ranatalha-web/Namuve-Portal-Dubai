const express = require('express');
const axios = require('axios');
const router = express.Router();

// Teable configuration
const TEABLE_BASE_URL = 'https://teable.namuve.com/api';
const TEABLE_TOKEN = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN;
// Using the Room Availability summary table which has the correct structure
const TABLE_ID = 'tbl17O2d5TxVi7DMFp9'; // Room Details Table with Category field

// Fetch all room detail records from Teable
const fetchAllRoomDetailRecords = async () => {
  try {
    console.log('🔗 Fetching from Teable URL:', `${TEABLE_BASE_URL}/table/${TABLE_ID}/record`);
    console.log('🔑 Using token:', TEABLE_TOKEN ? 'YES' : 'NO');

    // Fetch with pagination to get all records with field data
    let allRecords = [];
    let skip = 0;
    const take = 100;
    let hasMore = true;

    while (hasMore) {
      console.log(`📄 Fetching page: skip=${skip}, take=${take}`);

      const response = await axios.get(
        `${TEABLE_BASE_URL}/table/${TABLE_ID}/record?skip=${skip}&take=${take}`,
        {
          headers: {
            'Authorization': `Bearer ${TEABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Teable API response status:', response.status);
      const records = response.data.records || [];
      console.log(`📊 Fetched ${records.length} records in this page`);

      if (records.length > 0) {
        console.log('📋 First record sample:', {
          id: records[0].id,
          fields: records[0].fields,
          hasFields: !!records[0].fields && Object.keys(records[0].fields).length > 0
        });
      }

      allRecords = allRecords.concat(records);

      // If we got fewer records than requested, we've reached the end
      if (records.length < take) {
        hasMore = false;
      } else {
        skip += take;
      }
    }

    console.log(`✅ Total records fetched: ${allRecords.length}`);
    return allRecords;
  } catch (error) {
    console.error('❌ Error fetching room detail records:', error.message);
    if (error.response) {
      console.error('❌ Teable API Status:', error.response.status);
      console.error('❌ Teable API Error:', error.response.data);
    }
    throw error;
  }
};

// Create a new room detail record
const createRoomDetailRecord = async (roomDetail) => {
  try {
    // Sync Apartment Name, Category, and availability fields to the summary table
    const requestBody = {
      records: [
        {
          fields: {
            "Apartment Name ": String(roomDetail.apartmentName || 'N/A'),
            "Category": String(roomDetail.category || determineRoomType(roomDetail.apartmentName) || ''),
            "Available ": String(roomDetail.available || 0),
            "Reserved": String(roomDetail.reserved || 0),
            "Blocked ": String(roomDetail.blocked || 0)
          }
        }
      ]
    };

    console.log('📤 Sending room detail request to Teable:', JSON.stringify(requestBody, null, 2));

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
    console.log('✅ Create response:', response.data);
    return response.data.records?.[0] || response.data;
  } catch (error) {
    console.error('❌ Error creating room detail record:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Teable Error Details:', error.response.data);
    }
    throw error;
  }
};

// Update an existing room detail record
const updateRoomDetailRecord = async (recordId, roomDetail) => {
  try {
    // Sync Apartment Name, Category, and availability fields to the summary table
    const response = await axios.patch(
      `${TEABLE_BASE_URL}/table/${TABLE_ID}/record`,
      {
        records: [
          {
            id: recordId,
            fields: {
              "Apartment Name ": String(roomDetail.apartmentName || 'N/A'),
              "Category": String(roomDetail.category || determineRoomType(roomDetail.apartmentName) || ''),
              "Available ": String(roomDetail.available || 0),
              "Reserved": String(roomDetail.reserved || 0),
              "Blocked ": String(roomDetail.blocked || 0)
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
    console.log('✅ Update response:', response.data);
    return response.data.records?.[0] || response.data;
  } catch (error) {
    console.error('❌ Error updating room detail record:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Teable Error Details:', error.response.data);
    }
    throw error;
  }
};

// Delete a room detail record
const deleteRoomDetailRecord = async (recordId) => {
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
    console.log('✅ Deleted record:', recordId);
  } catch (error) {
    console.error('❌ Error deleting room detail record:', error.message);
    if (error.response) {
      console.error('❌ Delete error details:', error.response.data);
    }
    // Don't throw - just log the error and continue
  }
};

// Determine room type from apartment name (fallback only)
// Room types are now determined dynamically from the room-availability table
const determineRoomType = (apartmentName) => {
  if (!apartmentName) return '';

  // Try to extract from name patterns
  const nameUpper = apartmentName.toUpperCase();

  if (nameUpper.includes('STUDIO') || nameUpper.includes('(S)')) return 'Studio';
  if (nameUpper.includes('3BR') || nameUpper.includes('3 BR') || nameUpper.includes('(3B)')) return '3BR';
  if (nameUpper.includes('2BR') || nameUpper.includes('2 BR') || nameUpper.includes('(2B)')) return '2BR';
  if (nameUpper.includes('1BR') || nameUpper.includes('1 BR') || nameUpper.includes('(1B)')) return '1BR';

  return '';
};

// Auto-populate room types for all apartments
const autoPopulateRoomTypes = async () => {
  try {
    console.log('🔄 Starting auto-populate room types...');

    const records = await fetchAllRoomDetailRecords();
    console.log(`📊 Found ${records.length} records to process`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
      const apartmentName = record.fields["Apartment Name "] || '';
      const currentRoomType = record.fields["Room Type"] || '';

      // Determine the correct room type
      const correctRoomType = determineRoomType(apartmentName);

      // Only update if room type is missing or incorrect
      if (correctRoomType && correctRoomType !== currentRoomType) {
        console.log(`📝 Updating ${apartmentName}: "${currentRoomType}" → "${correctRoomType}"`);

        await updateRoomDetailRecord(record.id, {
          apartmentName: apartmentName,
          roomType: correctRoomType,
          available: parseInt(record.fields["Available "] || 0),
          reserved: parseInt(record.fields["Reserved"] || 0),
          blocked: parseInt(record.fields["Blocked "] || 0)
        });
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`✅ Auto-populate complete: ${updated} updated, ${skipped} skipped`);
    return { updated, skipped, total: records.length };
  } catch (error) {
    console.error('❌ Error auto-populating room types:', error.message);
    throw error;
  }
};

// Sync room details to Teable
const syncRoomDetailsToTeable = async (roomDetails) => {
  const startTime = Date.now();
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let unchanged = 0;
  let errors = 0;

  try {
    console.log('📊 Starting room details sync to Teable...');

    if (!TEABLE_TOKEN) {
      throw new Error('TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN not configured in .env');
    }

    // Fetch existing records
    const existingRecords = await fetchAllRoomDetailRecords();
    console.log(`📊 Found ${existingRecords.length} existing records in Teable`);

    // Process room details
    console.log('📊 Processing room details data:', JSON.stringify(roomDetails, null, 2));

    // Create a map of existing records by apartment name
    const existingMap = new Map();
    existingRecords.forEach(record => {
      // Use the correct field name from Teable
      const apartmentName = record.fields["Listing Name"] || record.fields["Apartment Name "];
      if (apartmentName) {
        existingMap.set(apartmentName, record);
      }
    });

    // Track which records we've processed
    const processedRecords = new Set();

    // Process each room detail
    for (const detail of roomDetails) {
      try {
        const apartmentName = detail.apartmentName || detail.name;
        const existingRecord = existingMap.get(apartmentName);

        if (existingRecord) {
          // Always PATCH existing record to update all fields (including new ones)
          await updateRoomDetailRecord(existingRecord.id, {
            apartmentName: apartmentName,
            category: detail.category || determineRoomType(apartmentName),
            available: detail.available || 0,
            reserved: detail.reserved || 0,
            blocked: detail.blocked || 0
          });
          updated++;
          console.log(`✅ Updated with PATCH: ${apartmentName}`);

          // Mark as processed and remove from map
          processedRecords.add(existingRecord.id);
          existingMap.delete(apartmentName);
        } else {
          // POST new record
          await createRoomDetailRecord({
            apartmentName: apartmentName,
            category: detail.category || determineRoomType(apartmentName),
            available: detail.available || 0,
            reserved: detail.reserved || 0,
            blocked: detail.blocked || 0
          });
          created++;
          console.log(`✅ Created with POST: ${apartmentName}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${detail.apartmentName}:`, error.message);
        errors++;
      }
    }

    // Delete records that are no longer in the source data
    for (const [apartmentName, record] of existingMap.entries()) {
      if (!processedRecords.has(record.id)) {
        await deleteRoomDetailRecord(record.id);
        deleted++;
        console.log(`🗑️ Deleted: ${apartmentName}`);
      }
    }

    const syncTime = Date.now() - startTime;
    console.log(`✅ Sync completed: ${created} created, ${updated} updated, ${unchanged} unchanged, ${deleted} deleted, ${errors} errors (${syncTime}ms)`);

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
    console.error('❌ Error syncing room details to Teable:', error.message);
    errors++;

    const syncTime = Date.now() - startTime;
    return {
      success: false,
      created,
      updated,
      unchanged,
      deleted,
      errors,
      syncTime,
      error: error.message
    };
  }
};

// API Routes

// GET /api/room-details-teable/data - Fetch all records
router.get('/data', async (req, res) => {
  try {
    console.log('📥 GET /api/room-details-teable/data request received');
    console.log('🔑 Token configured:', !!TEABLE_TOKEN);
    console.log('📊 Table ID:', TABLE_ID);
    console.log('🔗 Teable Base URL:', TEABLE_BASE_URL);

    if (!TEABLE_TOKEN) {
      console.error('❌ TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN not configured');
      return res.status(500).json({
        success: false,
        error: 'TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN not configured in .env'
      });
    }

    console.log('🔄 Calling fetchAllRoomDetailRecords...');
    const records = await fetchAllRoomDetailRecords();
    console.log(`✅ Fetched ${records.length} records from Teable`);
    console.log('📋 First record sample:', records[0]);

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('❌ Error in GET /data:', error.message);
    console.error('❌ Error details:', error.response?.data || error);

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// POST /api/room-details-teable/sync - Sync room details
router.post('/sync', async (req, res) => {
  try {
    const { roomDetails } = req.body;

    if (!roomDetails || !Array.isArray(roomDetails)) {
      return res.status(400).json({
        success: false,
        error: 'roomDetails array is required'
      });
    }

    const result = await syncRoomDetailsToTeable(roomDetails);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/room-details-teable/update-status/:recordId - Update HW/HK status
router.put('/update-status/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { statusType, newStatus } = req.body;

    console.log(`🔄 Updating ${statusType} status for record ${recordId} to: ${newStatus}`);

    if (!recordId || !statusType || !newStatus) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: recordId, statusType, newStatus'
      });
    }

    // Note: Room Details Teable only has Available/Reserved/Blocked fields
    // HW/HK status updates should go to the main cleaning status table
    // For now, we'll return success but log that this needs proper implementation
    console.log('⚠️ HW/HK status updates need to be implemented in cleaning status table');

    res.json({
      success: true,
      message: 'Status update received (implementation pending for cleaning status table)',
      recordId,
      statusType,
      newStatus
    });
  } catch (error) {
    console.error('❌ Error updating status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/room-details-teable/test - Test endpoint
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing room details Teable connection...');

    // Test 1: Fetch existing records
    const records = await fetchAllRoomDetailRecords();
    console.log(`✅ Successfully fetched ${records.length} records`);

    // Test 2: Create a sample record
    const testData = {
      apartmentName: 'Test Apartment 101',
      available: 1,
      reserved: 0,
      blocked: 0
    };

    const newRecord = await createRoomDetailRecord(testData);
    console.log('✅ Successfully created test record:', newRecord.id);

    res.json({
      success: true,
      message: 'Teable connection test successful',
      existingRecords: records.length,
      testRecordId: newRecord.id
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Auto-populate room types endpoint
router.post('/auto-populate-room-types', async (req, res) => {
  try {
    console.log('🚀 Auto-populate room types endpoint called');
    const result = await autoPopulateRoomTypes();

    res.json({
      success: true,
      message: 'Room types auto-populated successfully',
      ...result
    });
  } catch (error) {
    console.error('❌ Auto-populate failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Manual sync endpoint - trigger room details sync from occupancy data
router.post('/manual-sync', async (req, res) => {
  try {
    console.log('🚀 Manual room details sync endpoint called');

    // Fetch occupancy data
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const occupancyResponse = await fetch(`${apiUrl}/api/occupancy/current`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!occupancyResponse.ok) {
      throw new Error(`Failed to fetch occupancy data: ${occupancyResponse.status}`);
    }

    const occupancyData = await occupancyResponse.json();
    const availabilityData = occupancyData.data || occupancyData;

    if (!availabilityData.roomTypes) {
      throw new Error('No roomTypes data in occupancy response');
    }

    // Collect apartments
    const allApartments = [];
    for (const roomType of availabilityData.roomTypes) {
      if (roomType.apartments) {
        const apartments = [
          ...(roomType.apartments.available || []),
          ...(roomType.apartments.reserved || []),
          ...(roomType.apartments.blocked || [])
        ];

        apartments.forEach(apt => {
          allApartments.push({
            apartmentName: apt.internalName || apt.name,
            category: roomType.roomType,
            available: apt.status === 'available' ? 1 : 0,
            reserved: apt.status === 'reserved' ? 1 : 0,
            blocked: apt.status === 'blocked' ? 1 : 0
          });
        });
      }
    }

    console.log(`📤 Syncing ${allApartments.length} apartments to Teable...`);

    // Sync to Teable
    const syncResult = await syncRoomDetailsToTeable(allApartments);

    res.json({
      success: true,
      message: 'Manual sync completed',
      apartmentsSynced: allApartments.length,
      syncResult
    });
  } catch (error) {
    console.error('❌ Manual sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;
