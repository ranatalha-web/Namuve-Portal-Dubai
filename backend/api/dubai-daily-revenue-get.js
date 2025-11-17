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

/**
 * GET /api/dubai-daily-revenue-get/latest
 * Get the latest daily revenue value from Dubai Daily Revenue table
 */
router.get('/latest', async (req, res) => {
  try {
    console.log('\n🏙️ Getting Latest Daily Revenue from Teable');
    
    // Get token
    const finalToken = process.env.TEABLE_BEARER_TOKEN || config.TEABLE_BEARER_TOKEN;
    if (!finalToken) {
      return res.status(400).json({
        success: false,
        message: 'TEABLE_BEARER_TOKEN not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('📅 Fetching from Dubai Daily Revenue table...');
    
    const url = `${TEABLE_BASE_URL}/api/table/${DAILY_TABLE_ID}/record`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Failed to fetch from Teable: ${response.status}`,
        timestamp: new Date().toISOString()
      });
    }

    const data = await response.json();
    
    if (!data.records || !Array.isArray(data.records)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response format from Teable',
        timestamp: new Date().toISOString()
      });
    }
    
    if (data.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No daily revenue records found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Sort records by date/time to get the latest one
    const sortedRecords = data.records
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
    
    res.status(200).json({
      success: true,
      message: 'Latest daily revenue retrieved successfully',
      data: {
        revenue: revenueValue.toFixed(2),
        dateTime: latestDateTime,
        recordId: latestRecord.id,
        totalRecords: data.records.length
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
  res.status(200).json({
    success: true,
    message: 'Dubai Daily Revenue Get API is healthy',
    service: 'Dubai Daily Revenue Get Service',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
