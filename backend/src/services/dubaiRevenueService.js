/**
 * Dubai Revenue Service
 * Fetches Dubai revenue data from Teable databases
 */

const axios = require('axios');

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
const MONTHLY_TABLE_ID = 'tblbswOqGUpJMx5fy2v'; // Dubai Monthly Revenue table

// Token for Teable API
const TEABLE_TOKEN = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN || 'teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=';

/**
 * Fetch all records from a Teable table with pagination
 * @param {string} tableId - The table ID
 * @param {number} pageSize - Records per page (default 100)
 * @returns {Promise<Array>} All records from the table
 */
async function fetchAllRecordsFromTable(tableId, pageSize = 100) {
  const allRecords = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${TEABLE_BASE_URL}/api/table/${tableId}/record?take=${pageSize}&skip=${skip}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (!response.ok) {
        console.error(`❌ Teable API error: ${response.status}`);
        throw new Error(`Failed to fetch from Teable: ${response.status}`);
      }

      const data = await response.json();

      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('Invalid response format from Teable');
      }

      const records = data.records;

      if (records.length === 0) {
        hasMore = false;
      } else {
        allRecords.push(...records);
        skip += pageSize;

        if (records.length < pageSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching records from Teable:`, error.message);
      throw error;
    }
  }

  return allRecords;
}

/**
 * Get Dubai daily revenue
 * @returns {Promise<Object>} Daily revenue data with success status
 */
async function getDubaiRevenue() {
  try {
    console.log('📊 Fetching Dubai daily revenue from Teable...');

    const records = await fetchAllRecordsFromTable(DAILY_TABLE_ID, 100);

    if (records.length === 0) {
      return {
        success: false,
        error: 'No revenue records found'
      };
    }

    // Get the latest record (last one in the array)
    const latestRecord = records[records.length - 1];
    const fields = latestRecord.fields || {};

    // Parse revenue values
    const totalDailyRevenue = parseFloat(fields['Daily Revenue Actual'] || fields['Daily Revenue'] || 0);
    const dateTime = fields['Date and Time '] || fields['Date'] || new Date().toISOString();

    return {
      success: true,
      revenue: {
        totalDailyRevenue,
        dateTime,
        recordId: latestRecord.id
      },
      recordCount: records.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching Dubai revenue:', error.message);
    return {
      success: false,
      error: error.message,
      revenue: {
        totalDailyRevenue: 0
      }
    };
  }
}

/**
 * Get Dubai monthly revenue
 * @returns {Promise<Object>} Monthly revenue data with success status
 */
async function getDubaiMonthlyRevenue() {
  try {
    console.log('📊 Fetching Dubai monthly revenue from Teable...');

    const records = await fetchAllRecordsFromTable(MONTHLY_TABLE_ID, 100);

    if (records.length === 0) {
      return {
        success: false,
        error: 'No monthly revenue records found'
      };
    }

    // Get the latest record
    const latestRecord = records[records.length - 1];
    const fields = latestRecord.fields || {};

    const actualRevenue = parseFloat(fields['Actual Revenue'] || 0);
    const expectedRevenue = parseFloat(fields['Expected Revenue '] || 0);
    const monthlyTarget = parseFloat(fields['MONTHLY TARGET Achieved'] || 0);

    return {
      success: true,
      revenue: {
        actualRevenue,
        expectedRevenue,
        monthlyTarget,
        recordId: latestRecord.id
      },
      recordCount: records.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching Dubai monthly revenue:', error.message);
    return {
      success: false,
      error: error.message,
      revenue: {
        actualRevenue: 0,
        expectedRevenue: 0
      }
    };
  }
}

/**
 * Get Dubai revenue summary (latest daily + monthly)
 * @returns {Promise<Object>} Combined revenue summary
 */
async function getDubaiRevenueSummary() {
  try {
    console.log('📊 Fetching Dubai revenue summary...');

    const [dailyResult, monthlyResult] = await Promise.all([
      getDubaiRevenue(),
      getDubaiMonthlyRevenue()
    ]);

    return {
      success: dailyResult.success && monthlyResult.success,
      daily: dailyResult,
      monthly: monthlyResult,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error fetching Dubai revenue summary:', error.message);
    return {
      success: false,
      error: error.message,
      daily: { success: false },
      monthly: { success: false }
    };
  }
}

// Export functions
module.exports = {
  getDubaiRevenue,
  getDubaiMonthlyRevenue,
  getDubaiRevenueSummary,
  fetchAllRecordsFromTable
};
