/**
 * Dubai Daily Revenue Get API - Simple endpoint to get latest daily revenue
 * Directly fetches from Dubai Daily Revenue Teable
 */

const express = require('express');
const router = express.Router();
const config = require('../src/config/config');

// Ensure fetch is available
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ Fetch not available');
  throw new Error('Fetch API not available');
}

// Teable Configuration
const TEABLE_BASE_URL = 'https://teable.namuve.com';
const DAILY_TABLE_ID = 'tblYkmcHlxN3i9Mazjg'; // Dubai Daily Revenue table

// Hardcoded token for Teable API (without Bearer prefix - will be added in headers)
const FORMATTED_TOKEN = 'teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=';

/**
 * Helper function to fetch all records with pagination using fetch
 */
async function fetchAllRecords(token, pageSize = 100) {
  const allRecords = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${TEABLE_BASE_URL}/api/table/${DAILY_TABLE_ID}/record?take=${pageSize}&skip=${skip}`;
    
    console.log(`📡 Fetching from URL: ${url}`);
    console.log(`🔑 Token starts with: ${token.substring(0, 20)}...`);
    
    try {
      console.log(`🔐 Using Authorization header: Bearer ${token.substring(0, 20)}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📨 Response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ Teable API error: ${response.status}`);
        const errorText = await response.text();
        console.error(`❌ Error details:`, errorText);
        throw new Error(`Failed to fetch from Teable: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('Invalid response format from Teable');
      }

      allRecords.push(...data.records);
      
      // Check if there are more records to fetch
      hasMore = data.records.length === pageSize;
      skip += pageSize;
      
      console.log(`📥 Fetched ${allRecords.length} records so far...`);
    } catch (error) {
      console.error(`❌ Teable API error: ${error.message}`);
      throw error;
    }
  }

  return allRecords;
}

/**
 * GET /api/dubai-daily-revenue-get/latest
 * Get the latest daily revenue value from Dubai Daily Revenue table
 */
router.get('/latest', async (req, res) => {
  try {
    console.log('\n🏙️ [DUBAI-DAILY] Getting Latest Daily Revenue from Teable');
    console.log(`🔑 [DUBAI-DAILY] Token check: ${FORMATTED_TOKEN ? 'FOUND' : 'NOT FOUND'}`);
    
    if (!FORMATTED_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'TEABLE_REVENUE_BEARER_TOKEN or TEABLE_BEARER_TOKEN not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('📅 [DUBAI-DAILY] Fetching all records from Dubai Daily Revenue table...');
    
    const allRecords = await fetchAllRecords(FORMATTED_TOKEN);
    
    if (allRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No daily revenue records found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Sort records by date/time to get the latest one
    const sortedRecords = allRecords
      .filter(record => {
        const dateTime = record.fields['Date and Time '] || record.fields['Date and Time'];
        const revenue = record.fields['Daily Revenue Actual'] || record.fields['Daily Revenue'];
        return dateTime && revenue;
      })
      .sort((a, b) => {
        const dateA = a.fields['Date and Time '] || a.fields['Date and Time'];
        const dateB = b.fields['Date and Time '] || b.fields['Date and Time'];
        return new Date(dateB) - new Date(dateA); // Sort descending (latest first)
      });
    
    if (sortedRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid daily revenue records found',
        timestamp: new Date().toISOString()
      });
    }
    
    const latestRecord = sortedRecords[0];
    const latestRevenue = latestRecord.fields['Daily Revenue Actual'] || latestRecord.fields['Daily Revenue'];
    const latestDateTime = latestRecord.fields['Date and Time '] || latestRecord.fields['Date and Time'];
    
    const revenueValue = parseFloat(latestRevenue);
    if (isNaN(revenueValue)) {
      return res.status(400).json({
        success: false,
        message: 'Latest revenue value is not a valid number',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`📊 Latest daily revenue: ${revenueValue.toFixed(2)} AED`);
    console.log(`📅 From: ${latestDateTime}`);
    console.log(`📈 Total records processed: ${allRecords.length}`);
    
    res.status(200).json({
      success: true,
      message: 'Latest daily revenue retrieved successfully',
      data: {
        revenue: revenueValue.toFixed(2),
        dateTime: latestDateTime,
        recordId: latestRecord.id,
        totalRecords: allRecords.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting latest daily revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


/**
 * GET /api/dubai-daily-revenue-get/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  console.log('🏥 [DUBAI-DAILY] Health check called');
  res.status(200).json({
    success: true,
    message: 'Dubai Daily Revenue Get API is healthy',
    service: 'Dubai Daily Revenue Get Service',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/dubai-daily-revenue-get/debug
 * Debug endpoint to test token and table ID
 */
router.get('/debug', (req, res) => {
  res.status(200).json({
    success: true,
    token: FORMATTED_TOKEN.substring(0, 30) + '...',
    tableId: DAILY_TABLE_ID,
    baseUrl: TEABLE_BASE_URL,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
