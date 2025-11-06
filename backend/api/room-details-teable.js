const express = require('express');
const axios = require('axios');
const router = express.Router();

// Teable configuration
const TEABLE_BASE_URL = 'https://teable.namuve.com/api';
const TEABLE_TOKEN = process.env.TEABLE_BEARER_TOKEN;
const TABLE_ID = 'tbl3sOergTEzWWLemi2'; // Room Details Table

// Fetch all room detail records from Teable
const fetchAllRoomDetailRecords = async () => {
  try {
    const response = await axios.get(
      `${TEABLE_BASE_URL}/table/${TABLE_ID}/record`,
      {
        headers: {
          'Authorization': `Bearer ${TEABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.records || [];
  } catch (error) {
    console.error('❌ Error fetching room detail records:', error.message);
    throw error;
  }
};

// Create a new room detail record
const createRoomDetailRecord = async (roomDetail) => {
  try {
    const requestBody = {
      records: [
        {
          fields: {
            "Apartment Name ": String(roomDetail.apartmentName || 'N/A'),
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
    const response = await axios.patch(
      `${TEABLE_BASE_URL}/table/${TABLE_ID}/record`,
      {
        records: [
          {
            id: recordId,
            fields: {
              "Apartment Name ": String(roomDetail.apartmentName || 'N/A'),
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
      throw new Error('TEABLE_BEARER_TOKEN not configured');
    }

    // Fetch existing records
    const existingRecords = await fetchAllRoomDetailRecords();
    console.log(`📊 Found ${existingRecords.length} existing records in Teable`);

    // Process room details
    console.log('📊 Processing room details data:', JSON.stringify(roomDetails, null, 2));
    
    // Create a map of existing records by apartment name
    const existingMap = new Map();
    existingRecords.forEach(record => {
      const apartmentName = record.fields["Apartment Name "];
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
    const records = await fetchAllRoomDetailRecords();
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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

module.exports = router;
