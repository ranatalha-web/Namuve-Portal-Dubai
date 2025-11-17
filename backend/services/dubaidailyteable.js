/**
 * Dubai Daily Revenue Teable Posting Service
 * Posts daily Dubai revenue data to Teable database
 */

const config = require('../src/config/config');
const { getDubaiRevenue } = require('../src/services/dubaiRevenueService');

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
const TEABLE_TABLE_ID = 'tblYkmcHlxN3i9Mazjg';
const TEABLE_TOKEN = process.env.TEABLE_BEARER_TOKEN || config.TEABLE_BEARER_TOKEN;

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
  
  return {
    date: `${year}-${month}-${day}`,
    dateTime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    timestamp: pakistanTime.toISOString()
  };
}

/**
 * Check if data already exists for current hour (Pakistan time)
 * Prevents duplicate postings within the same hour
 */
async function checkIfDataExistsForCurrentHour() {
  try {
    // Get token
    const finalToken = process.env.TEABLE_BEARER_TOKEN || config.TEABLE_BEARER_TOKEN;
    if (!finalToken) {
      console.error('❌ TEABLE_BEARER_TOKEN not configured');
      return false;
    }
    
    const { dateTime } = getPakistanDateTime();
    const currentHour = dateTime.substring(0, 13); // YYYY-MM-DD HH
    
    console.log(`🔍 Checking for existing data in hour: ${currentHour}`);
    
    const url = `${TEABLE_BASE_URL}/api/table/${TEABLE_TABLE_ID}/record`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ Failed to check existing data: ${response.status}`);
      return false; // If we can't check, block posting to be safe
    }

    const data = await response.json();
    const records = data.records || [];
    
    // Check if any record exists in the current hour
    const existsInHour = records.some(record => {
      const recordDateTime = record.fields['Date and Time '];
      if (recordDateTime) {
        const recordHour = recordDateTime.substring(0, 13);
        return recordHour === currentHour;
      }
      return false;
    });

    if (existsInHour) {
      console.log(`⚠️ DATA ALREADY EXISTS for hour: ${currentHour}`);
      return true;
    }

    console.log(`✅ No existing data for hour: ${currentHour}`);
    return false;

  } catch (error) {
    console.error('❌ Error checking existing data:', error.message);
    return false; // Block posting if we can't verify
  }
}

/**
 * Post Dubai daily revenue to Teable
 */
async function postDubaiDailyRevenue() {
  try {
    console.log('\n========================================');
    console.log('🏙️  DUBAI DAILY REVENUE POSTING STARTED');
    console.log('========================================\n');

    // Check if data already posted for current hour
    const alreadyExists = await checkIfDataExistsForCurrentHour();
    if (alreadyExists) {
      const { dateTime } = getPakistanDateTime();
      const currentHour = dateTime.substring(0, 13);
      
      return {
        success: false,
        error: `DATA ALREADY POSTED: Revenue data for hour ${currentHour} (Pakistan Time) already exists in database. Only ONE post per hour is allowed to prevent duplicates.`,
        timestamp: new Date().toISOString()
      };
    }

    // Verify Teable token
    console.log('🔍 Debug - process.env.TEABLE_BEARER_TOKEN:', process.env.TEABLE_BEARER_TOKEN ? 'SET' : 'NOT_SET');
    console.log('🔍 Debug - config.TEABLE_BEARER_TOKEN:', config.TEABLE_BEARER_TOKEN ? 'SET' : 'NOT_SET');
    
    const finalToken = process.env.TEABLE_BEARER_TOKEN || config.TEABLE_BEARER_TOKEN;
    if (!finalToken) {
      throw new Error('TEABLE_BEARER_TOKEN not configured in environment variables');
    }

    // Step 1: Get Dubai revenue data
    console.log('📊 Fetching Dubai revenue data...');
    const revenueData = await getDubaiRevenue();

    if (!revenueData.success) {
      throw new Error(`Failed to fetch Dubai revenue: ${revenueData.error}`);
    }

    // Step 2: Get Pakistan date and time
    const { dateTime } = getPakistanDateTime();

    // Step 3: Extract daily revenue
    const dailyRevenue = parseFloat(revenueData.revenue.totalDailyRevenue || 0);

    console.log(`\n📅 Date and Time: ${dateTime}`);
    console.log(`💰 Daily Revenue: ${dailyRevenue.toFixed(2)} AED`);

    // Step 4: Prepare Teable record
    const teableRecord = {
      records: [
        {
          fields: {
            'Daily Revenue Actual': dailyRevenue.toString(),
            'Date and Time ': dateTime
          }
        }
      ]
    };

    console.log('\n📤 Posting to Teable...');
    console.log('Record:', JSON.stringify(teableRecord, null, 2));

    // Step 5: Post to Teable
    const url = `${TEABLE_BASE_URL}/api/table/${TEABLE_TABLE_ID}/record`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teableRecord)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Teable API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    console.log('\n========================================');
    console.log('✅ DUBAI DAILY REVENUE POSTED SUCCESSFULLY');
    console.log('========================================');
    console.log(`📅 Date and Time: ${dateTime}`);
    console.log(`💰 Daily Revenue: ${dailyRevenue.toFixed(2)} AED`);
    console.log(`📝 Record ID: ${result.records?.[0]?.id || 'N/A'}`);
    console.log('========================================\n');

    return {
      success: true,
      data: {
        dailyRevenue: dailyRevenue.toFixed(2),
        dateTime,
        currency: 'AED',
        recordId: result.records?.[0]?.id
      },
      revenueDetails: revenueData.revenue,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ Error posting Dubai daily revenue:', error.message);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Post specific Dubai revenue values (manual override)
 */
async function postSpecificDubaiRevenue(dailyRevenue, dateTime = null) {
  try {
    console.log('\n========================================');
    console.log('🏙️  MANUAL DUBAI REVENUE POSTING');
    console.log('========================================\n');

    // Check if data already posted for current hour
    const alreadyExists = await checkIfDataExistsForCurrentHour();
    if (alreadyExists) {
      const { dateTime: currentDateTime } = getPakistanDateTime();
      const currentHour = currentDateTime.substring(0, 13);
      
      return {
        success: false,
        error: `DATA ALREADY POSTED: Revenue data for hour ${currentHour} (Pakistan Time) already exists in database. Only ONE post per hour is allowed to prevent duplicates.`,
        timestamp: new Date().toISOString()
      };
    }

    // Verify Teable token
    console.log('🔍 Debug Manual - process.env.TEABLE_BEARER_TOKEN:', process.env.TEABLE_BEARER_TOKEN ? 'SET' : 'NOT_SET');
    console.log('🔍 Debug Manual - config.TEABLE_BEARER_TOKEN:', config.TEABLE_BEARER_TOKEN ? 'SET' : 'NOT_SET');
    
    const finalToken = process.env.TEABLE_BEARER_TOKEN || config.TEABLE_BEARER_TOKEN;
    if (!finalToken) {
      throw new Error('TEABLE_BEARER_TOKEN not configured in environment variables');
    }

    // Use provided dateTime or get current Pakistan time
    const finalDateTime = dateTime || getPakistanDateTime().dateTime;

    console.log(`📅 Date and Time: ${finalDateTime}`);
    console.log(`💰 Daily Revenue: ${dailyRevenue} AED`);

    // Prepare Teable record
    const teableRecord = {
      records: [
        {
          fields: {
            'Daily Revenue Actual': parseFloat(dailyRevenue).toString(),
            'Date and Time ': finalDateTime
          }
        }
      ]
    };

    console.log('\n📤 Posting to Teable...');

    // Post to Teable
    const url = `${TEABLE_BASE_URL}/api/table/${TEABLE_TABLE_ID}/record`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teableRecord)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Teable API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    console.log('\n========================================');
    console.log('✅ MANUAL DUBAI REVENUE POSTED SUCCESSFULLY');
    console.log('========================================');
    console.log(`📅 Date and Time: ${finalDateTime}`);
    console.log(`💰 Daily Revenue: ${dailyRevenue} AED`);
    console.log(`📝 Record ID: ${result.records?.[0]?.id || 'N/A'}`);
    console.log('========================================\n');

    return {
      success: true,
      data: {
        dailyRevenue: parseFloat(dailyRevenue).toFixed(2),
        dateTime: finalDateTime,
        currency: 'AED',
        recordId: result.records?.[0]?.id
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ Error posting manual Dubai revenue:', error.message);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get posting status (check if can post in current hour)
 */
async function getPostingStatus() {
  try {
    const { dateTime } = getPakistanDateTime();
    const currentHour = dateTime.substring(0, 13);
    
    const alreadyExists = await checkIfDataExistsForCurrentHour();
    
    return {
      success: true,
      canPost: !alreadyExists,
      currentDateTime: dateTime,
      currentHour,
      message: alreadyExists 
        ? `Data already posted for hour ${currentHour}. Cannot post again until next hour.`
        : `Ready to post for hour ${currentHour}.`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  postDubaiDailyRevenue,
  postSpecificDubaiRevenue,
  getPostingStatus,
  checkIfDataExistsForCurrentHour
};
