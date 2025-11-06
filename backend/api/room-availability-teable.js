const express = require('express');
const axios = require('axios');
const router = express.Router();

// Teable configuration
const TEABLE_BASE_URL = 'https://teable.namuve.com/api';
const TEABLE_TOKEN = process.env.TEABLE_BEARER_TOKEN;
const TABLE_ID = 'tblOUchMsdbCUcd6w1J'; // Room Availability Table

// Fetch all room availability records from Teable
const fetchAllAvailabilityRecords = async () => {
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
    console.error('❌ Error fetching availability records:', error.message);
    throw error;
  }
};

// Create a new room availability record
const createAvailabilityRecord = async (availabilityData) => {
  try {
    const requestBody = {
      records: [
        {
          fields: {
            "Studio ": String(availabilityData.studio || 0),
            "2BR Premium ": String(availabilityData.twoBRPremium || 0),
            "3BR": String(availabilityData.threeBR || 0),
            "1BR ": String(availabilityData.oneBR || 0),
            "Available ": String(availabilityData.available || 0),
            "Reserved ": String(availabilityData.reserved || 0),
            "2BR ": String(availabilityData.twoBR || 0),
            "Blocked ": String(availabilityData.blocked || 0)
          }
        }
      ]
    };
    
    console.log('📤 Sending availability request to Teable:', JSON.stringify(requestBody, null, 2));
    
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
    console.error('❌ Error creating availability record:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Teable Error Details:', error.response.data);
    }
    throw error;
  }
};

// Update an existing room availability record
const updateAvailabilityRecord = async (recordId, availabilityData) => {
  try {
    const response = await axios.patch(
      `${TEABLE_BASE_URL}/table/${TABLE_ID}/record`,
      {
        records: [
          {
            id: recordId,
            fields: {
              "Studio ": String(availabilityData.studio || 0),
              "2BR Premium ": String(availabilityData.twoBRPremium || 0),
              "3BR": String(availabilityData.threeBR || 0),
              "1BR ": String(availabilityData.oneBR || 0),
              "Available ": String(availabilityData.available || 0),
              "Reserved ": String(availabilityData.reserved || 0),
              "2BR ": String(availabilityData.twoBR || 0),
              "Blocked ": String(availabilityData.blocked || 0)
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
    console.error('❌ Error updating availability record:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Teable Error Details:', error.response.data);
    }
    throw error;
  }
};

// Sync room availability data to Teable
const syncAvailabilityToTeable = async (availabilityData) => {
  const startTime = Date.now();
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  try {
    console.log('📊 Starting room availability sync to Teable...');
    
    if (!TEABLE_TOKEN) {
      throw new Error('TEABLE_BEARER_TOKEN not configured');
    }

    // Fetch existing records
    const existingRecords = await fetchAllAvailabilityRecords();
    console.log(`📊 Found ${existingRecords.length} existing records in Teable`);

    // Process availability data
    console.log('📊 Processing room availability data:', JSON.stringify(availabilityData, null, 2));
    
    // Check if we have an existing record (assuming one record for current availability)
    const existingRecord = existingRecords.length > 0 ? existingRecords[0] : null;
    
    if (existingRecord) {
      console.log('📋 Existing record found:', existingRecord.id);
      console.log('📋 Current values:', existingRecord.fields);
    } else {
      console.log('📋 No existing record found, will create new one');
    }

    if (existingRecord) {
      // Always PATCH existing record to update all fields (including new ones)
      await updateAvailabilityRecord(existingRecord.id, availabilityData);
      updated++;
      console.log('✅ Updated existing availability record with PATCH');
    } else {
      // POST new record
      await createAvailabilityRecord(availabilityData);
      created++;
      console.log('✅ Created new availability record with POST');
    }

    const syncTime = Date.now() - startTime;
    console.log(`✅ Sync completed: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors (${syncTime}ms)`);

    return {
      success: true,
      created,
      updated,
      unchanged,
      errors,
      syncTime
    };

  } catch (error) {
    console.error('❌ Error syncing availability to Teable:', error.message);
    errors++;
    
    const syncTime = Date.now() - startTime;
    return {
      success: false,
      created,
      updated,
      unchanged,
      errors,
      syncTime,
      error: error.message
    };
  }
};

// API Routes

// GET /api/room-availability-teable/data - Fetch all records
router.get('/data', async (req, res) => {
  try {
    const records = await fetchAllAvailabilityRecords();
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

// POST /api/room-availability-teable/sync - Sync availability data
router.post('/sync', async (req, res) => {
  try {
    const { availabilityData } = req.body;
    
    if (!availabilityData) {
      return res.status(400).json({
        success: false,
        error: 'availabilityData is required'
      });
    }

    const result = await syncAvailabilityToTeable(availabilityData);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/room-availability-teable/test - Test endpoint
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing room availability Teable connection...');
    
    // Test 1: Fetch existing records
    const records = await fetchAllAvailabilityRecords();
    console.log(`✅ Successfully fetched ${records.length} records`);
    
    // Test 2: Create a sample record
    const testData = {
      studio: 5,
      twoBRPremium: 3,
      threeBR: 2,
      oneBR: 4,
      available: 10,
      reserved: 4,
      twoBR: 6,
      blocked: 2
    };
    
    const newRecord = await createAvailabilityRecord(testData);
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
