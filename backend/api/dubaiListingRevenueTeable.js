const axios = require('axios');

// Get Teable configuration from environment variables
const TEABLE_LISTING_REVENUE_URL = process.env.TEABLE_LISTING_REVENUE_TABLE_URL;
const TEABLE_REVENUE_TOKEN = process.env.TEABLE_REVENUE_BEARER_TOKEN;

/**
 * Store listing revenue breakdown (Studio, 1BR, 2BR, Total) to Teable database
 * Uses POST to create new record, then PATCH to update if exists
 * Stores dynamically fetched values, no hardcoding
 */
async function storeListingRevenue(listingData) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`\n📊 Storing LISTING revenue for ${today}:`, listingData);
    console.log(`🔗 Using Teable URL: ${TEABLE_LISTING_REVENUE_URL}`);
    console.log(`🔐 Token present: ${TEABLE_REVENUE_TOKEN ? '✅ Yes' : '❌ No'}`);
    
    // First, try to GET all records and find the latest one
    try {
      const getResponse = await axios.get(TEABLE_LISTING_REVENUE_URL, {
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
        console.log(`📝 Found latest record: ${recordId}, updating with LISTING values...`);
        
        const patchPayload = {
          record: {
            fields: {
              'Studio': String(listingData.studio || 0),
              '1BR': String(listingData.oneBR || 0),
              '2BR': String(listingData.twoBR || 0),
              'Total': String(listingData.total || 0)
            }
          }
        };
        
        console.log(`📤 PATCH payload:`, JSON.stringify(patchPayload, null, 2));
        
        const updateResponse = await axios.patch(
          `${TEABLE_LISTING_REVENUE_URL}/${recordId}`,
          patchPayload,
          {
            headers: {
              'Authorization': TEABLE_REVENUE_TOKEN,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ LISTING Revenue PATCHED successfully for ${today}:`, updateResponse.data);
        return updateResponse.data;
      }
    } catch (getError) {
      console.log(`⚠️ Could not fetch existing record, will try to POST new record:`, getError.message);
    }
    
    // Record doesn't exist or GET failed - use POST to create
    console.log(`✨ Creating new LISTING revenue record for ${today}...`);
    
    const createPayload = {
      records: [
        {
          fields: {
            'Studio': String(listingData.studio || 0),
            '1BR': String(listingData.oneBR || 0),
            '2BR': String(listingData.twoBR || 0),
            'Total': String(listingData.total || 0)
          }
        }
      ]
    };
    
    console.log(`📤 POST payload (LISTING values):`, JSON.stringify(createPayload, null, 2));
    
    const createResponse = await axios.post(
      TEABLE_LISTING_REVENUE_URL,
      createPayload,
      {
        headers: {
          'Authorization': TEABLE_REVENUE_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ LISTING Revenue POSTed successfully for ${today}:`, createResponse.data);
    return createResponse.data;
    
  } catch (error) {
    console.error(`❌ Error storing LISTING revenue:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

module.exports = {
  storeListingRevenue
};
