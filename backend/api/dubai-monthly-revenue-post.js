/**
 * Dubai Monthly Revenue Post API - Simple endpoint to post latest daily revenue to monthly table
 * Gets latest daily revenue and posts it to Monthly Revenue Actual table
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
const MONTHLY_TABLE_ID = 'tblgqswZdUmCUeUzgs0'; // Monthly Revenue Actual table

/**
 * Get current date and time in Pakistan timezone
 */
function getPakistanDateTime() {
  const now = new Date();
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  
  const year = pakistanTime.getUTCFullYear();
  const month = (pakistanTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = pakistanTime.getUTCDate().toString().padStart(2, '0');
  const hours = pakistanTime.getUTCHours().toString().padStart(2, '0');
  const minutes = pakistanTime.getUTCMinutes().toString().padStart(2, '0');
  const seconds = pakistanTime.getUTCSeconds().toString().padStart(2, '0');
  
  const dateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  return {
    dateTime,
    pakistanTime,
    timestamp: pakistanTime.toISOString()
  };
}

/**
 * POST /api/dubai-monthly-revenue-post/post
 * Get latest daily revenue and post it to monthly revenue table
 */
router.post('/post', async (req, res) => {
  try {
    console.log('\n🏙️ Monthly Revenue Posting - Get Latest Daily & Post to Monthly');
    
    // Get token
    const finalToken = process.env.TEABLE_BEARER_TOKEN || config.TEABLE_BEARER_TOKEN;
    if (!finalToken) {
      return res.status(400).json({
        success: false,
        message: 'TEABLE_BEARER_TOKEN not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    // Step 1: Get latest daily revenue
    console.log('📊 Step 1: Getting latest daily revenue...');
    
    const dailyUrl = `${TEABLE_BASE_URL}/api/table/${DAILY_TABLE_ID}/record`;
    
    const dailyResponse = await fetch(dailyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dailyResponse.ok) {
      return res.status(dailyResponse.status).json({
        success: false,
        message: `Failed to fetch daily revenue: ${dailyResponse.status}`,
        timestamp: new Date().toISOString()
      });
    }

    const dailyData = await dailyResponse.json();
    
    if (!dailyData.records || !Array.isArray(dailyData.records) || dailyData.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No daily revenue records found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Sort records by date/time to get the latest one
    const sortedRecords = dailyData.records
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
    
    // Step 2: Post to monthly revenue table
    console.log('💰 Step 2: Posting to monthly revenue table...');
    
    const { dateTime } = getPakistanDateTime();
    const monthlyRevenue = revenueValue.toFixed(2);
    
    // Prepare Teable record for monthly table
    const monthlyRecord = {
      records: [
        {
          fields: {
            'Monthly Revenue Actual': monthlyRevenue,
            'Date and Time': dateTime
          }
        }
      ]
    };
    
    console.log('📤 Posting record:', JSON.stringify(monthlyRecord, null, 2));
    
    const monthlyUrl = `${TEABLE_BASE_URL}/api/table/${MONTHLY_TABLE_ID}/record`;
    
    const monthlyResponse = await fetch(monthlyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(monthlyRecord)
    });

    if (!monthlyResponse.ok) {
      const errorText = await monthlyResponse.text();
      return res.status(monthlyResponse.status).json({
        success: false,
        message: `Failed to post to monthly table: ${monthlyResponse.status}`,
        error: errorText,
        timestamp: new Date().toISOString()
      });
    }

    const monthlyResult = await monthlyResponse.json();
    
    console.log('✅ Successfully posted to monthly revenue table!');
    
    res.status(200).json({
      success: true,
      message: 'Latest daily revenue posted to monthly table successfully',
      data: {
        monthlyRevenue: monthlyRevenue,
        monthlyDateTime: dateTime,
        sourceRevenue: latestRevenue,
        sourceDateTime: latestDateTime,
        sourceRecordId: latestRecord.id,
        monthlyRecordId: monthlyResult.records?.[0]?.id || 'unknown'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error posting monthly revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during monthly revenue posting',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-revenue-post/preview
 * Preview what would be posted (without actually posting)
 */
router.get('/preview', async (req, res) => {
  try {
    console.log('\n🏙️ Monthly Revenue Preview - Show what would be posted');
    
    // Get token
    const finalToken = process.env.TEABLE_BEARER_TOKEN || config.TEABLE_BEARER_TOKEN;
    if (!finalToken) {
      return res.status(400).json({
        success: false,
        message: 'TEABLE_BEARER_TOKEN not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get latest daily revenue (same logic as post)
    const dailyUrl = `${TEABLE_BASE_URL}/api/table/${DAILY_TABLE_ID}/record`;
    
    const dailyResponse = await fetch(dailyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dailyResponse.ok) {
      return res.status(dailyResponse.status).json({
        success: false,
        message: `Failed to fetch daily revenue: ${dailyResponse.status}`,
        timestamp: new Date().toISOString()
      });
    }

    const dailyData = await dailyResponse.json();
    
    if (!dailyData.records || !Array.isArray(dailyData.records) || dailyData.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No daily revenue records found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get latest record
    const sortedRecords = dailyData.records
      .filter(record => {
        const dateTime = record.fields['Date and Time '] || record.fields['Date and Time'];
        const revenue = record.fields['Daily Revenue Actual'] || record.fields['Daily Revenue'];
        return dateTime && revenue;
      })
      .sort((a, b) => {
        const dateA = a.fields['Date and Time '] || a.fields['Date and Time'];
        const dateB = b.fields['Date and Time '] || b.fields['Date and Time'];
        return new Date(dateB) - new Date(dateA);
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
    
    const { dateTime } = getPakistanDateTime();
    
    res.status(200).json({
      success: true,
      message: 'Preview of what would be posted to monthly table',
      preview: {
        wouldPost: {
          'Monthly Revenue Actual': latestRevenue,
          'Date and Time': dateTime
        },
        source: {
          revenue: latestRevenue,
          dateTime: latestDateTime,
          recordId: latestRecord.id
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error previewing monthly revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during preview',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-revenue-post/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dubai Monthly Revenue Post API is healthy',
    service: 'Dubai Monthly Revenue Post Service',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
