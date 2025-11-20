/**
 * Dubai Monthly Revenue Teable Posting Service
 * Sums all daily Dubai revenue for the current month and posts to Monthly Revenue Actual table
 */

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
  // Pakistan is UTC+5
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  
  // Use getUTC methods since we manually adjusted the time
  const year = pakistanTime.getUTCFullYear().toString();
  const month = (pakistanTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = pakistanTime.getUTCDate().toString().padStart(2, '0');
  const hours = pakistanTime.getUTCHours().toString().padStart(2, '0');
  const minutes = pakistanTime.getUTCMinutes().toString().padStart(2, '0');
  const seconds = pakistanTime.getUTCSeconds().toString().padStart(2, '0');
  
  const dateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  console.log(`🕐 Pakistan DateTime: ${dateTime}`);
  
  return {
    dateTime,
    year,
    month,
    day,
    pakistanTime,
    timestamp: pakistanTime.toISOString()
  };
}

/**
 * Get the first and last day of current month in Pakistan timezone
 */
function getCurrentMonthRange() {
  const { year, month } = getPakistanDateTime();
  
  const firstDay = `${year}-${month}-01`;
  
  // Get last day of month
  const lastDayOfMonth = new Date(year, month, 0).getDate(); // month is 1-based, so this gets last day
  const lastDay = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`;
  
  return {
    firstDay,
    lastDay,
    monthYear: `${year}-${month}`
  };
}

/**
 * Fetch the latest (last) daily revenue record from Dubai Daily Revenue table
 */
async function fetchLatestDailyRevenue() {
  try {
    // Get token - use monthly token for this table
    const finalToken = process.env.TEABLE_MONTHLY_BEARER_TOKEN || process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN || config.TEABLE_MONTHLY_BEARER_TOKEN;
    if (!finalToken) {
      throw new Error('TEABLE_MONTHLY_BEARER_TOKEN not configured');
    }
    
    console.log(`📅 Fetching latest daily revenue record...`);
    
    const url = `${TEABLE_BASE_URL}/api/table/${DAILY_TABLE_ID}/record`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': finalToken.startsWith('Bearer ') ? finalToken : `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch daily revenue: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('Invalid response format from daily revenue table');
    }
    
    if (data.records.length === 0) {
      throw new Error('No daily revenue records found');
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
      throw new Error('No valid daily revenue records found');
    }
    
    const latestRecord = sortedRecords[0];
    const latestRevenue = latestRecord.fields['Daily Revenue Actual'] || latestRecord.fields['Daily Revenue'];
    const latestDateTime = latestRecord.fields['Date and Time '] || latestRecord.fields['Date and Time'];
    
    const revenueValue = parseFloat(latestRevenue);
    if (isNaN(revenueValue)) {
      throw new Error('Latest revenue value is not a valid number');
    }
    
    console.log(`📊 Latest daily revenue record found:`);
    console.log(`📅 Date: ${latestDateTime}`);
    console.log(`💰 Revenue: ${revenueValue.toFixed(2)} AED`);
    
    return {
      success: true,
      latestRevenue: revenueValue,
      latestDateTime: latestDateTime,
      recordId: latestRecord.id,
      totalRecords: data.records.length
    };
    
  } catch (error) {
    console.error('❌ Error fetching latest daily revenue:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if monthly revenue already posted for current month
 */
async function checkIfMonthlyDataExists() {
  try {
    // Get token - use monthly token for this table
    const finalToken = process.env.TEABLE_MONTHLY_BEARER_TOKEN || process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN || config.TEABLE_MONTHLY_BEARER_TOKEN;
    if (!finalToken) {
      return false;
    }
    
    const { monthYear } = getCurrentMonthRange();
    
    console.log(`🔍 Checking if monthly data exists for: ${monthYear}`);
    
    const url = `${TEABLE_BASE_URL}/api/table/${MONTHLY_TABLE_ID}/record`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': finalToken.startsWith('Bearer ') ? finalToken : `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {   
      console.error(`❌ Failed to check monthly data: ${response.status}`);
      return false;
    }

    const data = await response.json();
    
    if (!data.records || !Array.isArray(data.records)) {
      return false;
    }
    
    // Check if any record exists for current month
    const existingRecord = data.records.find(record => {
      const dateTime = record.fields['Date and Time'] || record.fields['Date and Time '];
      if (!dateTime) return false;
      
      // Check if the record is from current month (YYYY-MM)
      const recordMonth = dateTime.substring(0, 7); // YYYY-MM
      return recordMonth === monthYear;
    });
    
    if (existingRecord) {
      console.log(`⚠️ Monthly data already exists for ${monthYear}`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Error checking monthly data:', error.message);
    return false; // If we can't check, allow posting
  }
}

/**
 * Post monthly revenue total to Monthly Revenue Actual table
 */
async function postMonthlyRevenue() {
  try {
    console.log('\n========================================');
    console.log('📊 DUBAI MONTHLY REVENUE POSTING STARTED');
    console.log('========================================');
    
    // Check if already posted for this month
    const dataExists = await checkIfMonthlyDataExists();
    if (dataExists) {
      const { monthYear } = getCurrentMonthRange();
      return {
        success: false,
        error: `MONTHLY DATA ALREADY POSTED: Revenue data for month ${monthYear} already exists in database. Only ONE post per month is allowed.`,
        timestamp: new Date().toISOString()
      };
    }
    
    // Verify Teable token
    console.log('🔍 Debug Monthly - process.env.TEABLE_MONTHLY_BEARER_TOKEN:', process.env.TEABLE_MONTHLY_BEARER_TOKEN ? 'SET' : 'NOT_SET');
    console.log('🔍 Debug Monthly - config.TEABLE_MONTHLY_BEARER_TOKEN:', config.TEABLE_MONTHLY_BEARER_TOKEN ? 'SET' : 'NOT_SET');
    
    const finalToken = process.env.TEABLE_MONTHLY_BEARER_TOKEN || process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN || config.TEABLE_MONTHLY_BEARER_TOKEN;
    if (!finalToken) {
      throw new Error('TEABLE_MONTHLY_BEARER_TOKEN not configured in environment variables');
    }

    // Step 1: Fetch latest daily revenue record
    console.log('📊 Fetching latest daily revenue data...');
    const latestData = await fetchLatestDailyRevenue();

    if (!latestData.success) {
      throw new Error(`Failed to fetch latest revenue: ${latestData.error}`);
    }

    // Step 2: Prepare data for posting
    const { dateTime } = getPakistanDateTime();
    const monthlyRevenue = latestData.latestRevenue.toFixed(2);

    console.log(`📅 Date and Time: ${dateTime}`);
    console.log(`💰 Monthly Revenue (Latest): ${monthlyRevenue} AED`);
    console.log(`📊 Source: Latest daily record from ${latestData.latestDateTime}`);

    // Step 3: Prepare Teable record
    const teableRecord = {
      records: [
        {
          fields: {
            'Monthly Revenue Actual': monthlyRevenue,
            'Date and Time': dateTime
          }
        }
      ]
    };

    console.log('\n📤 Posting monthly total to Teable...');
    console.log('Record:', JSON.stringify(teableRecord, null, 2));

    // Step 4: Post to Monthly Revenue Actual table
    const url = `${TEABLE_BASE_URL}/api/table/${MONTHLY_TABLE_ID}/record`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': finalToken.startsWith('Bearer ') ? finalToken : `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teableRecord)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Teable API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Monthly revenue posted successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));

    return {
      success: true,
      message: 'Dubai monthly revenue posted successfully',
      data: {
        monthlyRevenue: monthlyRevenue,
        dateTime: dateTime,
        sourceRecord: latestData.latestDateTime,
        sourceRecordId: latestData.recordId,
        totalDailyRecords: latestData.totalRecords,
        recordId: result.records?.[0]?.id || 'unknown'
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ Error posting Dubai monthly revenue:', error.message);
    
    return {
      success: false,
      message: 'Failed to post Dubai monthly revenue',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    console.log('\n========================================');
    console.log('📊 MONTHLY REVENUE POSTING COMPLETED');
    console.log('========================================');
  }
}

/**
 * Fetch all monthly revenue records from Teable with pagination support
 * @param {number} take - Number of records to fetch (default: 100)
 * @param {number} skip - Number of records to skip (default: 0)
 * @returns {Promise<Object>} Response with monthly revenue records
 */
async function fetchMonthlyRevenueRecords(take = 100, skip = 0) {
  try {
    console.log('📊 Fetching monthly revenue records from Teable...');
    console.log(`📊 Pagination: take=${take}, skip=${skip}`);
    
    // Get token - use monthly token for this table
    const finalToken = process.env.TEABLE_MONTHLY_BEARER_TOKEN || process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN || config.TEABLE_MONTHLY_BEARER_TOKEN;
    if (!finalToken) {
      throw new Error('TEABLE_MONTHLY_BEARER_TOKEN not configured');
    }
    
    // Add pagination parameters to URL
    const url = `${TEABLE_BASE_URL}/api/table/${MONTHLY_TABLE_ID}/record?take=${take}&skip=${skip}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': finalToken.startsWith('Bearer ') ? finalToken : `Bearer ${finalToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch monthly revenue records: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('Invalid response format from monthly revenue table');
    }
    
    console.log(`✅ Fetched ${data.records.length} monthly revenue records`);
    
    // Log all available record dates and field names
    console.log(`📋 Available record dates:`);
    data.records.forEach((record, index) => {
      console.log(`   Record ${index + 1} fields:`, Object.keys(record.fields));
      const dateTime = record.fields['Date and Time'] || record.fields['Date and Time '];
      const revenue = record.fields['Monthly Revenue Actual'];
      console.log(`   - DateTime: ${dateTime}`);
      console.log(`   - Revenue: ${revenue}`);
      if (dateTime && revenue) {
        const recordDate = new Date(dateTime);
        const day = recordDate.getDate();
        console.log(`   ${index + 1}. ${dateTime} (Day ${day}) - ${revenue} AED`);
      }
    });
    
    // Sort records by date (newest first)
    const sortedRecords = data.records
      .filter(record => {
        const dateTime = record.fields['Date and Time'] || record.fields['Date and Time '];
        const revenue = record.fields['Monthly Revenue Actual'];
        return dateTime && revenue;
      })
      .sort((a, b) => {
        const dateA = a.fields['Date and Time'] || a.fields['Date and Time '];
        const dateB = b.fields['Date and Time'] || b.fields['Date and Time '];
        return new Date(dateB) - new Date(dateA); // Sort descending (newest first)
      })
      .map(record => ({
        id: record.id,
        monthlyRevenue: parseFloat(record.fields['Monthly Revenue Actual']) || 0,
        dateTime: record.fields['Date and Time'] || record.fields['Date and Time '],
        autoNumber: record.autoNumber || 0
      }));
    
    console.log(`✅ After filtering: ${sortedRecords.length} valid records`);
    console.log(`📋 Sorted records:`, sortedRecords.slice(0, 5).map(r => ({ dateTime: r.dateTime, revenue: r.monthlyRevenue })));
    
    // Get current month's revenue with 2nd of month logic
    const { monthYear } = getCurrentMonthRange();
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    
    console.log(`📅 Current date: ${currentDate.toISOString().split('T')[0]} (Day ${currentDay})`);
    
    let currentMonthRevenue = 0;
    
    // Check if we have passed the 2nd of the month (day >= 2 means 2nd or later)
    const hasPassedSecondOfMonth = currentDay >= 2;
    
    if (hasPassedSecondOfMonth) {
      // Sum ALL records from current month (from 2nd onwards)
      console.log(`🔍 Summing all records from month: ${monthYear}`);
      console.log(`📋 Looking through ${sortedRecords.length} records...`);
      
      const currentMonthRecords = sortedRecords.filter(record => {
        if (!record.dateTime) {
          console.log(`   ⚠️ Record has no dateTime`);
          return false;
        }
        const recordMonth = record.dateTime.substring(0, 7); // YYYY-MM
        const recordDate = new Date(record.dateTime);
        const recordDay = recordDate.getDate();
        
        const isCurrentMonth = recordMonth === monthYear;
        const isFromSecondOrLater = recordDay >= 2;
        const isMatch = isCurrentMonth && isFromSecondOrLater;
        
        console.log(`   📅 Record: ${record.dateTime} | Month: ${recordMonth} | Day: ${recordDay} | CurrentMonth: ${isCurrentMonth} | FromSecondOrLater: ${isFromSecondOrLater} | Include: ${isMatch}`);
        
        return isMatch;
      });
      
      // Sum all matching records
      currentMonthRevenue = currentMonthRecords.reduce((sum, record) => sum + record.monthlyRevenue, 0);
      
      console.log(`✅ Found ${currentMonthRecords.length} records from month ${monthYear}`);
      console.log(`💰 Total revenue from current month (2nd onwards): ${currentMonthRevenue} AED`);
      
      // If no records found, log warning
      if (currentMonthRecords.length === 0) {
        console.log(`⚠️ WARNING: No records found in Monthly Revenue table for ${monthYear}`);
        console.log(`📋 Total records in table: ${sortedRecords.length}`);
        if (sortedRecords.length > 0) {
          console.log(`📋 Sample records:`, sortedRecords.slice(0, 3).map(r => ({ dateTime: r.dateTime, revenue: r.monthlyRevenue })));
        }
      }
      
      console.log(`📊 Month logic: Today is day ${currentDay} (>= 2), showing total revenue from month: ${currentMonthRevenue} AED`);
    } else {
      console.log(`📊 Month logic: Today is day ${currentDay} (< 2), showing 0 (2nd hasn't arrived yet)`);
      currentMonthRevenue = 0;
    }
    
    // Get latest (most recent) revenue
    const latestRecord = sortedRecords[0];
    
    console.log(`📅 Current month (${monthYear}): ${currentMonthRevenue} AED`);
    console.log(`📊 Latest record:`, latestRecord ? `${latestRecord.monthlyRevenue} AED (${latestRecord.dateTime})` : 'No data');
    console.log(`📊 Month status: ${hasPassedSecondOfMonth ? 'PASSED 2ND' : 'BEFORE 2ND'}`);
    
    return {
      success: true,
      data: {
        records: sortedRecords,
        totalRecords: sortedRecords.length,
        currentMonthRevenue: currentMonthRevenue, // Using new 2nd of month logic
        latestRevenue: latestRecord?.monthlyRevenue || 0,
        latestDateTime: latestRecord?.dateTime || null,
        currentMonth: monthYear,
        hasPassedSecondOfMonth: hasPassedSecondOfMonth,
        currentDay: currentDay
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error fetching monthly revenue records:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Manual posting with custom month/year (for testing)
 */
async function postMonthlyRevenueManual(year, month) {
  try {
    console.log('\n========================================');
    console.log('📊 MANUAL MONTHLY REVENUE POSTING');
    console.log('========================================');
    
    // Override month range for manual posting
    const customFirstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const customLastDay = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;
    const customMonthYear = `${year}-${month.toString().padStart(2, '0')}`;
    
    console.log(`📅 Manual posting for: ${customMonthYear}`);
    console.log(`📅 Date range: ${customFirstDay} to ${customLastDay}`);
    
    // Similar logic but with custom date range...
    // (Implementation would be similar to postMonthlyRevenue but with custom dates)
    
    return {
      success: true,
      message: `Manual monthly revenue posting for ${customMonthYear} - Implementation needed`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('\n❌ Error in manual monthly posting:', error.message);
    
    return {
      success: false,
      message: 'Failed to post monthly revenue manually',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch ALL monthly revenue records with automatic pagination
 * @returns {Promise<Object>} Response with all monthly revenue records
 */
async function fetchAllMonthlyRevenueRecords() {
  try {
    console.log('📊 Fetching ALL monthly revenue records with pagination...');
    
    let allRecords = [];
    let skip = 0;
    const take = 100; // Teable limit
    let hasMoreRecords = true;
    
    while (hasMoreRecords) {
      console.log(`📊 Fetching batch: skip=${skip}, take=${take}`);
      
      const batchResult = await fetchMonthlyRevenueRecords(take, skip);
      
      if (!batchResult.success) {
        throw new Error(batchResult.error || 'Failed to fetch batch');
      }
      
      const batchRecords = batchResult.data.records || [];
      allRecords = allRecords.concat(batchRecords);
      
      console.log(`📊 Batch fetched: ${batchRecords.length} records`);
      console.log(`📊 Total records so far: ${allRecords.length}`);
      
      // Check if we got fewer records than requested (end of data)
      if (batchRecords.length < take) {
        hasMoreRecords = false;
        console.log('📊 Reached end of records');
      } else {
        skip += take;
      }
    }
    
    console.log(`✅ Fetched total ${allRecords.length} monthly revenue records`);
    
    return {
      success: true,
      data: {
        records: allRecords,
        totalRecords: allRecords.length
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error fetching all monthly revenue records:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Calculate quarterly revenue from monthly records
 * @returns {Promise<Object>} Response with quarterly revenue data
 */
async function calculateQuarterlyRevenue() {
  try {
    console.log('📊 Calculating quarterly revenue...');
    
    // Fetch all monthly records
    const allRecordsResult = await fetchAllMonthlyRevenueRecords();
    if (!allRecordsResult.success) {
      throw new Error(allRecordsResult.error || 'Failed to fetch monthly records');
    }
    
    const allRecords = allRecordsResult.data.records;
    console.log(`📊 Processing ${allRecords.length} monthly records for quarterly calculation`);
    
    // Group records by quarter
    const quarterlyData = {};
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentQuarter = Math.ceil(currentMonth / 3);
    
    console.log(`📅 Current: Year ${currentYear}, Month ${currentMonth}, Quarter ${currentQuarter}`);
    
    allRecords.forEach(record => {
      if (!record.dateTime || !record.monthlyRevenue) return;
      
      const recordDate = new Date(record.dateTime);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth() + 1;
      const recordQuarter = Math.ceil(recordMonth / 3);
      
      const quarterKey = `${recordYear}-Q${recordQuarter}`;
      
      if (!quarterlyData[quarterKey]) {
        quarterlyData[quarterKey] = {
          year: recordYear,
          quarter: recordQuarter,
          months: [],
          totalRevenue: 0,
          recordCount: 0
        };
      }
      
      quarterlyData[quarterKey].months.push({
        month: recordMonth,
        revenue: record.monthlyRevenue,
        dateTime: record.dateTime
      });
      quarterlyData[quarterKey].totalRevenue += record.monthlyRevenue;
      quarterlyData[quarterKey].recordCount++;
    });
    
    // Get current quarter data
    const currentQuarterKey = `${currentYear}-Q${currentQuarter}`;
    const currentQuarterData = quarterlyData[currentQuarterKey];
    
    // Calculate current quarter revenue (sum of all records in current quarter)
    let currentQuarterRevenue = 0;
    let isCurrentQuarterComplete = false;
    
    if (currentQuarterData) {
      const monthsInCurrentQuarter = currentQuarterData.months.length;
      
      // Always show the sum of all records in current quarter
      currentQuarterRevenue = currentQuarterData.totalRevenue;
      
      // Check if current quarter is complete (has 3 months)
      if (monthsInCurrentQuarter >= 3) {
        isCurrentQuarterComplete = true;
        console.log(`📊 Current quarter Q${currentQuarter} is COMPLETE with ${monthsInCurrentQuarter} months`);
      } else {
        console.log(`📊 Current quarter Q${currentQuarter} is IN PROGRESS with ${monthsInCurrentQuarter} months`);
      }
      
      console.log(`💰 Current Quarter Total Revenue: AED ${currentQuarterRevenue.toLocaleString()}`);
    }
    
    // Sort quarters by year and quarter
    const sortedQuarters = Object.keys(quarterlyData)
      .sort((a, b) => {
        const [yearA, quarterA] = a.split('-Q');
        const [yearB, quarterB] = b.split('-Q');
        if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA); // Newest year first
        return parseInt(quarterB) - parseInt(quarterA); // Newest quarter first
      });
    
    console.log(`📊 Quarterly Revenue Summary:`);
    sortedQuarters.forEach(quarterKey => {
      const data = quarterlyData[quarterKey];
      console.log(`   ${quarterKey}: AED ${data.totalRevenue.toLocaleString()} (${data.recordCount} months)`);
    });
    
    console.log(`💰 Current Quarter Revenue: AED ${currentQuarterRevenue.toLocaleString()}`);
    console.log(`📊 Current Quarter Status: ${isCurrentQuarterComplete ? 'COMPLETE' : 'IN PROGRESS'}`);
    
    return {
      success: true,
      data: {
        currentQuarterRevenue,
        isCurrentQuarterComplete,
        currentQuarter,
        currentYear,
        quarterlyBreakdown: quarterlyData,
        sortedQuarters,
        totalRecordsProcessed: allRecords.length
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error calculating quarterly revenue:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  postMonthlyRevenue,
  postMonthlyRevenueManual,
  fetchLatestDailyRevenue,
  fetchMonthlyRevenueRecords,
  fetchAllMonthlyRevenueRecords,
  calculateQuarterlyRevenue,
  checkIfMonthlyDataExists,
  getCurrentMonthRange
};
