const axios = require('axios');

// Get Teable configuration from environment variables
const TEABLE_RESERVATIONS_URL = process.env.TEABLE_DUBAI_RESERVATIONS_TABLE_URL;
const TEABLE_REVENUE_TOKEN = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN || process.env.TEABLE_REVENUE_BEARER_TOKEN;

/**
 * Fetch payment details from Teable database (FAST - from Teable)
 * Returns all current reservations stored in Teable
 * Returns empty array immediately if Teable is empty (will be populated by background sync)
 */
async function fetchPaymentDetailsFromDatabase() {
  try {
    console.log(`\n📊 Fetching payment details from Teable database...`);
    
    if (!TEABLE_RESERVATIONS_URL || !TEABLE_REVENUE_TOKEN) {
      console.error('❌ Teable configuration missing');
      throw new Error('Teable configuration not found');
    }

    const startTime = Date.now();

    // Fetch all records from Teable
    const authHeader = TEABLE_REVENUE_TOKEN.startsWith('Bearer ') ? TEABLE_REVENUE_TOKEN : `Bearer ${TEABLE_REVENUE_TOKEN}`;
    
    const response = await axios.get(TEABLE_RESERVATIONS_URL, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      timeout: 1000  // 1 second timeout for speed
    });

    const records = response.data.records || [];
    
    // Transform Teable records to reservation format
    const reservations = records.map(record => {
      const fields = record.fields || {};
      
      // Format dates properly
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr; // Return as-is if invalid
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        } catch (e) {
          return dateStr;
        }
      };
      
      return {
        id: record.id,
        reservationId: fields['Reservation ID '] || fields['Reservation ID'] || '',
        guestName: fields['Guest Name'] || '',
        listingName: fields['Listing Name'] || '',
        arrivalDate: formatDate(fields['Arrival Date']),
        departureDate: formatDate(fields['Departure Date']),
        totalAmount: parseFloat(fields['Total Amount '] || fields['Total Amount'] || 0) || 0,
        paidAmount: parseFloat(fields['Paid Amount'] || 0) || 0,
        remainingAmount: parseFloat(fields['Remaining Amount'] || 0) || 0,
        paymentStatus: fields['Payment Status'] || '',
        reservationStatus: fields['Reservation Status'] || '',
        teableRecordId: record.id,
        createdTime: record.createdTime,
        modifiedTime: record.modifiedTime
      };
    });

    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Fetched ${records.length} payment records from Teable in ${loadTime}ms`);
    
    return {
      success: true,
      data: reservations,
      total: reservations.length,
      loadTime: `${loadTime}ms`,
      timestamp: new Date().toISOString(),
      source: 'teable'
    };
  } catch (error) {
    console.error(`⚠️ Teable fetch timeout/error:`, error.message);
    
    // Return empty data immediately (non-blocking)
    return {
      success: true,
      data: [],
      total: 0,
      loadTime: '0ms',
      timestamp: new Date().toISOString(),
      source: 'teable',
      note: 'Empty - being populated by background sync'
    };
  }
}

/**
 * Fetch achieved revenue from Teable database
 */
async function fetchAchievedRevenueFromDatabase() {
  try {
    console.log(`\n💰 Fetching achieved revenue from Teable database...`);
    
    const teableUrl = process.env.TEABLE_REVENUE_TABLE_URL;
    const teableToken = process.env.TEABLE_REVENUE_BEARER_TOKEN;
    
    if (!teableUrl || !teableToken) {
      console.error('❌ Teable revenue configuration missing');
      throw new Error('Teable revenue configuration not found');
    }

    const startTime = Date.now();

    const authHeader = teableToken.startsWith('Bearer ') ? teableToken : `Bearer ${teableToken}`;
    
    const response = await axios.get(teableUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const records = response.data.records || [];
    
    if (records.length === 0) {
      return {
        success: true,
        data: {
          dailyAchieved: 0,
          monthlyAchieved: 0,
          quarterlyAchieved: 0
        },
        loadTime: '0ms'
      };
    }

    // Get the latest record
    const latestRecord = records.reduce((latest, current) => {
      return new Date(current.createdTime) > new Date(latest.createdTime) ? current : latest;
    });

    const fields = latestRecord.fields || {};
    const loadTime = Date.now() - startTime;

    const achievedRevenue = {
      dailyAchieved: parseFloat(fields['Daily Actual Revenue'] || 0) || 0,
      monthlyAchieved: parseFloat(fields['MONTHLY Actual Revenue'] || 0) || 0,
      quarterlyAchieved: parseFloat(fields['QUARTERLY Achieved Revenue'] || 0) || 0
    };

    console.log(`✅ Fetched achieved revenue from Teable in ${loadTime}ms:`, achievedRevenue);

    return {
      success: true,
      data: achievedRevenue,
      loadTime: `${loadTime}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error fetching achieved revenue:`, error.message);
    
    return {
      success: true,
      data: {
        dailyAchieved: 0,
        monthlyAchieved: 0,
        quarterlyAchieved: 0
      },
      loadTime: '0ms',
      warning: 'No achieved revenue data available'
    };
  }
}

/**
 * Fetch listing revenue from Teable database
 */
async function fetchListingRevenueFromDatabase() {
  try {
    console.log(`\n🏢 Fetching listing revenue from Teable database...`);
    
    const teableUrl = process.env.TEABLE_LISTING_REVENUE_TABLE_URL;
    const teableToken = process.env.TEABLE_REVENUE_BEARER_TOKEN;
    
    if (!teableUrl || !teableToken) {
      console.error('❌ Teable listing revenue configuration missing');
      throw new Error('Teable listing revenue configuration not found');
    }

    const startTime = Date.now();

    const authHeader = teableToken.startsWith('Bearer ') ? teableToken : `Bearer ${teableToken}`;
    
    const response = await axios.get(teableUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const records = response.data.records || [];
    
    if (records.length === 0) {
      return {
        success: true,
        data: {
          studio: 0,
          oneBR: 0,
          twoBR: 0,
          total: 0
        },
        loadTime: '0ms'
      };
    }

    // Get the latest record
    const latestRecord = records.reduce((latest, current) => {
      return new Date(current.createdTime) > new Date(latest.createdTime) ? current : latest;
    });

    const fields = latestRecord.fields || {};
    const loadTime = Date.now() - startTime;

    const listingRevenue = {
      studio: parseFloat(fields['Studio'] || 0) || 0,
      oneBR: parseFloat(fields['1BR'] || 0) || 0,
      twoBR: parseFloat(fields['2BR'] || 0) || 0,
      total: parseFloat(fields['Total'] || 0) || 0
    };

    console.log(`✅ Fetched listing revenue from Teable in ${loadTime}ms:`, listingRevenue);

    return {
      success: true,
      data: listingRevenue,
      loadTime: `${loadTime}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error fetching listing revenue:`, error.message);
    
    return {
      success: true,
      data: {
        studio: 0,
        oneBR: 0,
        twoBR: 0,
        total: 0
      },
      loadTime: '0ms',
      warning: 'No listing revenue data available'
    };
  }
}

module.exports = {
  fetchPaymentDetailsFromDatabase,
  fetchAchievedRevenueFromDatabase,
  fetchListingRevenueFromDatabase
};
