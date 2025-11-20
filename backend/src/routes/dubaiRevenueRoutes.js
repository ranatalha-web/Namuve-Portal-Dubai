/**
 * Dubai Revenue Routes - Using Dubai Listing Revenue Service
 * Direct API routes for Dubai revenue data from Hostaway API
 */

const express = require('express');
const router = express.Router();
const dubaiListingRevenueService = require('../../services/dubaiListingRevenue');

// Ensure express is available for middleware
const jsonParser = express.json();

// Lazy load the Teable storage functions
let storeDailyRevenue;
let storeListingRevenue;
try {
  const dubaiRevenueModule = require('../../api/dubaiRevenue');
  storeDailyRevenue = dubaiRevenueModule.storeDailyRevenue;
  console.log('✅ Teable achieved revenue storage module loaded');
} catch (error) {
  console.error('⚠️ Could not load Teable achieved revenue storage module:', error.message);
}

try {
  const dubaiListingRevenueModule = require('../../api/dubaiListingRevenueTeable');
  storeListingRevenue = dubaiListingRevenueModule.storeListingRevenue;
  console.log('✅ Teable listing revenue storage module loaded');
} catch (error) {
  console.error('⚠️ Could not load Teable listing revenue storage module:', error.message);
}

/**
 * POST /api/dubai-revenue/store
 * Store achieved revenue to Teable database
 * Body: { dailyAchieved, monthlyAchieved, quarterlyAchieved }
 */
router.post('/store', jsonParser, async (req, res) => {
  try {
    console.log(`\n🚀 ========================================`);
    console.log(`📤 POST /store received`);
    console.log(`📋 Content-Type:`, req.headers['content-type']);
    console.log(`📋 Content-Length:`, req.headers['content-length']);
    console.log(`📋 req.body:`, JSON.stringify(req.body));
    console.log(`📋 req.body keys:`, req.body ? Object.keys(req.body) : 'null');
    console.log(`🚀 ========================================\n`);
    
    // Get achieved revenue values from body
    const dailyAchieved = req.body?.dailyAchieved ?? 0;
    const monthlyAchieved = req.body?.monthlyAchieved ?? 0;
    const quarterlyAchieved = req.body?.quarterlyAchieved ?? 0;
    
    // Get listing revenue values from body
    const studio = req.body?.studio ?? 0;
    const oneBR = req.body?.oneBR ?? 0;
    const twoBR = req.body?.twoBR ?? 0;
    const total = req.body?.total ?? 0;
    
    console.log(`📤 Extracted ACHIEVED values:`, { dailyAchieved, monthlyAchieved, quarterlyAchieved });
    console.log(`📤 Extracted LISTING values:`, { studio, oneBR, twoBR, total });

    if (!storeDailyRevenue) {
      console.error('❌ storeDailyRevenue function not available');
      return res.status(500).json({
        success: false,
        error: 'Teable storage function not available'
      });
    }

    // Store achieved revenue
    const achievedResult = await storeDailyRevenue({
      dailyAchieved,
      monthlyAchieved,
      quarterlyAchieved
    });

    console.log(`✅ POST /store achieved result:`, achievedResult);
    
    // Store listing revenue if available and function is loaded
    let listingResult = null;
    if (storeListingRevenue && (studio || oneBR || twoBR || total)) {
      try {
        listingResult = await storeListingRevenue({
          studio,
          oneBR,
          twoBR,
          total
        });
        console.log(`✅ POST /store listing result:`, listingResult);
      } catch (listingError) {
        console.warn(`⚠️ Could not store listing revenue:`, listingError.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        achieved: achievedResult,
        listing: listingResult
      }
    });
  } catch (error) {
    console.error(`❌ POST /store error:`, error.message);
    console.error(`❌ Error stack:`, error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-revenue
 * Get Dubai revenue data with achieved values from Teable
 */
router.get('/', async (req, res) => {
  try {
    console.log('\n🏙️ ========================================');
    console.log('📊 API REQUEST: GET /api/dubai-revenue');
    console.log('🏙️ ========================================\n');
    
    const startTime = Date.now();
    
    // Get Dubai revenue data
    const dubaiRevenueData = await dubaiListingRevenueService.getDubaiRevenueAndOccupancy();
    
    // Get achieved revenue from Teable
    let achievedRevenue = {
      dailyAchieved: 0,
      monthlyAchieved: 0,
      quarterlyAchieved: 0
    };
    
    if (storeDailyRevenue) {
      try {
        // Fetch the latest record from Teable
        const axios = require('axios');
        const teableUrl = process.env.TEABLE_REVENUE_TABLE_URL;
        const teableToken = process.env.TEABLE_REVENUE_BEARER_TOKEN;
        
        if (teableUrl && teableToken) {
          const response = await axios.get(teableUrl, {
            headers: {
              'Authorization': `Bearer ${teableToken}`
            },
            params: {
              limit: 1,
              orderBy: '-createdTime'
            }
          });
          
          if (response.data.records && response.data.records.length > 0) {
            const record = response.data.records[0];
            const fields = record.fields || {};
            
            // Parse the achieved values from Teable
            achievedRevenue = {
              dailyAchieved: parseFloat(fields['Daily Actual Revenue'] || 0) || 0,
              monthlyAchieved: parseFloat(fields['MONTHLY Actual Revenue'] || 0) || 0,
              quarterlyAchieved: parseFloat(fields['QUARTERLY Achieved Revenue'] || 0) || 0
            };
            
            console.log(`✅ Achieved revenue fetched from Teable:`, achievedRevenue);
          }
        }
      } catch (teableError) {
        console.warn(`⚠️ Could not fetch achieved revenue from Teable:`, teableError.message);
      }
    }
    
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Dubai revenue data loaded in ${loadTime}ms`);
    
    res.json({
      success: true,
      data: {
        ...dubaiRevenueData.data,
        achievedRevenue: achievedRevenue
      },
      loadTime: `${loadTime}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in Dubai revenue route:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-revenue/listings
 * Get Dubai listings only
 */
router.get('/listings', async (req, res) => {
  try {
    console.log('📋 API Request: GET /api/dubai-revenue/listings');
    
    const startTime = Date.now();
    const dubaiListingsData = await dubaiListingRevenueService.fetchDubaiListingsData();
    const loadTime = Date.now() - startTime;
    
    // Transform data to include category information
    const listingsArray = [];
    Object.entries(dubaiListingsData).forEach(([category, listings]) => {
      listings.forEach(listing => {
        listingsArray.push({
          id: listing.id,
          name: listing.name,
          city: listing.city,
          country: listing.country,
          currency: listing.currency,
          category: category
        });
      });
    });
    
    res.json({
      success: true,
      listings: listingsArray,
      total: listingsArray.length,
      byCategory: Object.fromEntries(
        Object.entries(dubaiListingsData).map(([cat, listings]) => [cat, listings.length])
      ),
      loadTime: `${loadTime}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching Dubai listings:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-revenue/health
 * Health check for Dubai revenue API
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 Health check: Dubai Revenue API');
    
    res.json({
      success: true,
      status: 'healthy',
      service: 'Dubai Revenue API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        revenue: '/api/dubai-revenue - Get Dubai revenue and occupancy data',
        listings: '/api/dubai-revenue/listings - Get Dubai listings by category',
        health: '/api/dubai-revenue/health - Health check'
      },
      dataSource: 'Hostaway API (Dubai Listing Revenue Service)',
      features: [
        'Dynamic listing categorization',
        'Real-time reservation tracking',
        'Category-wise revenue breakdown',
        'Occupancy rate calculation'
      ]
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
