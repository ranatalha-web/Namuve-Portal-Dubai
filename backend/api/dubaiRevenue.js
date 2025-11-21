const axios = require('axios');

// Get Teable configuration from environment variables
const TEABLE_REVENUE_URL = process.env.TEABLE_REVENUE_TABLE_URL;
// Strip "Bearer " prefix if it already exists in the token
const rawToken = process.env.TEABLE_REVENUE_BEARER_TOKEN || '';
const cleanToken = rawToken.startsWith('Bearer ') ? rawToken.substring(7) : rawToken;
const TEABLE_REVENUE_TOKEN = `Bearer ${cleanToken}`;

/**
 * Store or update daily revenue in Teable database
 * Uses POST to create new record, then PATCH to update if exists
 * Stores ACHIEVED (target) values, not actual values
 */
async function storeDailyRevenue(revenueData) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`📊 Storing ACHIEVED revenue for ${today}:`, revenueData);
    console.log(`🔗 Using Teable URL: ${TEABLE_REVENUE_URL}`);
    console.log(`🔐 Token present: ${TEABLE_REVENUE_TOKEN ? '✅ Yes' : '❌ No'}`);
    
    // First, try to GET all records and find the latest one
    try {
      const getResponse = await axios.get(TEABLE_REVENUE_URL, {
        headers: {
          'Authorization': TEABLE_REVENUE_TOKEN,
          'Content-Type': 'application/json'
        }
      });

      const allRecords = getResponse.data.records || [];
      
      if (allRecords.length > 0) {
        // Find the latest record by createdTime
        const latestRecord = allRecords.reduce((latest, current) => {
          return new Date(current.createdTime) > new Date(latest.createdTime) ? current : latest;
        });
        
        const recordId = latestRecord.id;
        console.log(`📝 Found latest record: ${recordId}, updating with ACHIEVED values...`);
        
        const patchPayload = {
          record: {
            fields: {
              'Daily Actual Revenue': String(revenueData.dailyAchieved || 0),
              'MONTHLY Actual Revenue': String(revenueData.monthlyAchieved || 0),
              'QUARTERLY Achieved Revenue': String(revenueData.quarterlyAchieved || 0)
            }
          }
        };
        
        console.log(`📤 PATCH payload:`, JSON.stringify(patchPayload, null, 2));
        
        const updateResponse = await axios.patch(
          `${TEABLE_REVENUE_URL}/${recordId}`,
          patchPayload,
          {
            headers: {
              'Authorization': TEABLE_REVENUE_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ ACHIEVED Revenue PATCHED successfully for ${today}:`, updateResponse.data);
        return updateResponse.data;
      }
    } catch (getError) {
      console.log(`⚠️ Could not fetch existing record, will try to POST new record:`, getError.message);
    }
    
    // Record doesn't exist or GET failed - use POST to create
    console.log(`✨ Creating new ACHIEVED revenue record for ${today}...`);
    
    const createPayload = {
      records: [
        {
          fields: {
            'Daily Actual Revenue': String(revenueData.dailyAchieved || 0),
            'MONTHLY Actual Revenue': String(revenueData.monthlyAchieved || 0),
            'QUARTERLY Achieved Revenue': String(revenueData.quarterlyAchieved || 0)
          }
        }
      ]
    };
    
    console.log(`📤 POST payload (ACHIEVED values):`, JSON.stringify(createPayload, null, 2));
    
    const createResponse = await axios.post(
      TEABLE_REVENUE_URL,
      createPayload,
      {
        headers: {
          'Authorization': TEABLE_REVENUE_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ ACHIEVED Revenue POSTed successfully for ${today}:`, createResponse.data);
    return createResponse.data;
    
  } catch (error) {
    console.error(`❌ Error storing ACHIEVED revenue:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

/**
 * Retrieve daily revenue from Teable database
 */
async function getDailyRevenue(date = null) {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`🔍 Fetching revenue for ${targetDate}`);
    
    const response = await axios.get(TEABLE_REVENUE_URL, {
      headers: {
        'Authorization': TEABLE_REVENUE_TOKEN,
        'Content-Type': 'application/json'
      },
      params: {
        filter: JSON.stringify({
          filterByFormula: `{Date} = '${targetDate}'`
        })
      }
    });

    const records = response.data.records || [];
    
    if (records.length > 0) {
      const record = records[0];
      console.log(`✅ Revenue found for ${targetDate}:`, record.fields);
      return {
        success: true,
        data: {
          dailyActual: record.fields['Daily Actual Revenue'] || 0,
          monthlyActual: record.fields['Monthly Actual Revenue'] || 0,
          quarterlyActual: record.fields['Quarterly Actual Revenue'] || 0,
          date: targetDate
        }
      };
    } else {
      console.log(`⚠️ No revenue record found for ${targetDate}`);
      return {
        success: true,
        data: {
          dailyActual: 0,
          monthlyActual: 0,
          quarterlyActual: 0,
          date: targetDate
        }
      };
    }
  } catch (error) {
    console.error(`❌ Error fetching daily revenue:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Retrieve all revenue records
 */
async function getAllRevenue() {
  try {
    console.log(`🔍 Fetching all revenue records`);
    
    const response = await axios.get(TEABLE_REVENUE_URL, {
      headers: {
        'Authorization': TEABLE_REVENUE_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const records = response.data.records || [];
    console.log(`✅ Found ${records.length} revenue records`);
    
    return {
      success: true,
      data: records.map(record => ({
        id: record.id,
        dailyActual: record.fields['Daily Actual Revenue'] || 0,
        monthlyActual: record.fields['Monthly Actual Revenue'] || 0,
        quarterlyActual: record.fields['Quarterly Actual Revenue'] || 0,
        date: record.fields['Date']
      }))
    };
  } catch (error) {
    console.error(`❌ Error fetching all revenue:`, error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  storeDailyRevenue,
  getDailyRevenue,
  getAllRevenue
};
