const axios = require('axios');

/**
 * Revenue Service - Provides functions to retrieve and manage revenue data
 * This service serves as a bridge between routes and data sources
 */

// Cache for listings data
let listingsCache = null;
let listingsCacheTimestamp = null;
const LISTINGS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get revenue and occupancy data
 * This function fetches revenue data from available sources
 * @returns {Promise<Object>} Revenue and occupancy data
 */
async function getRevenueAndOccupancy() {
  try {
    console.log('📊 Fetching revenue and occupancy data...');
    
    // Try to get data from Teable Dubai tables
    const revenueData = await fetchRevenueFromTeable();
    
    if (!revenueData) {
      throw new Error('Unable to fetch revenue data from any source');
    }
    
    return {
      success: true,
      actualRevenue: revenueData.actualRevenue || 0,
      expectedRevenue: revenueData.expectedRevenue || 0,
      monthlyTargetAchieved: revenueData.monthlyTargetAchieved || 0,
      occupancyRate: revenueData.occupancyRate || 0,
      totalRooms: revenueData.totalRooms || 0,
      totalReserved: revenueData.totalReserved || 0,
      totalAvailable: revenueData.totalAvailable || 0,
      categoryAvailability: revenueData.categoryAvailability || {},
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error in getRevenueAndOccupancy:', error.message);
    return {
      success: false,
      error: error.message,
      actualRevenue: 0,
      expectedRevenue: 0,
      occupancyRate: 0,
      totalRooms: 0,
      totalReserved: 0,
      totalAvailable: 0
    };
  }
}

/**
 * Fetch revenue data from Teable
 * @returns {Promise<Object|null>} Revenue data or null if fetch fails
 */
async function fetchRevenueFromTeable() {
  try {
    const token = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN;
    
    if (!token) {
      console.warn('⚠️ TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN not configured');
      return null;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Fetch from Dubai monthly revenue table
    const response = await axios.get(
      'https://teable.namuve.com/api/table/tblbswOqGUpJMx5fy2v/records',
      { headers, timeout: 10000 }
    );
    
    if (response.data && response.data.records && response.data.records.length > 0) {
      const latestRecord = response.data.records[response.data.records.length - 1];
      const fields = latestRecord.fields || {};
      
      return {
        actualRevenue: parseFloat(fields['Actual Revenue'] || 0),
        expectedRevenue: parseFloat(fields['Expected Revenue '] || 0),
        monthlyTargetAchieved: parseFloat(fields['MONTHLY TARGET Achieved'] || 0),
        quarterlyTargetAchieved: parseFloat(fields['QUARTERLY TARGET Achieved'] || 0),
        dailyTargetAchieved: parseFloat(fields['DAILY TARGET Achieved'] || 0),
        occupancyRate: 0,
        totalRooms: 0,
        totalReserved: 0,
        totalAvailable: 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching from Teable:', error.message);
    return null;
  }
}

/**
 * Refresh listings cache from Hostaway API
 * @returns {Promise<Object>} Cached listings data
 */
async function refreshListingsCache() {
  try {
    console.log('🔄 Refreshing listings cache...');
    
    const authToken = process.env.HOSTAWAY_AUTH_TOKEN;
    if (!authToken) {
      throw new Error('HOSTAWAY_AUTH_TOKEN not configured');
    }
    
    const response = await axios.get(
      'https://api.hostaway.com/v1/listings',
      {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    if (response.data && response.data.result) {
      // Organize listings by categories
      listingsCache = organizeListingsByCategory(response.data.result);
      listingsCacheTimestamp = Date.now();
      
      console.log('✅ Listings cache refreshed');
      return listingsCache;
    }
    
    throw new Error('Invalid response format from Hostaway API');
  } catch (error) {
    console.error('❌ Error refreshing listings cache:', error.message);
    throw error;
  }
}

/**
 * Fetch listings data (uses cache if available)
 * @returns {Promise<Object>} Organized listings by category
 */
async function fetchListingsData() {
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (listingsCache && listingsCacheTimestamp && (now - listingsCacheTimestamp) < LISTINGS_CACHE_DURATION) {
      console.log('📋 Using cached listings data');
      return listingsCache;
    }
    
    // Refresh cache if expired
    return await refreshListingsCache();
  } catch (error) {
    console.error('❌ Error fetching listings data:', error.message);
    
    // Return empty cache structure if error
    return {
      Pakistani: [],
      Dubai: [],
      Other: []
    };
  }
}

/**
 * Organize listings by category
 * @param {Array} listings - Raw listings from API
 * @returns {Object} Listings organized by category
 */
function organizeListingsByCategory(listings) {
  const organized = {
    Pakistani: [],
    Dubai: [],
    Other: []
  };
  
  listings.forEach(listing => {
    // Determine category based on listing properties
    // This is a simple example - adjust based on your actual data structure
    if (listing.title && listing.title.includes('Dubai')) {
      organized.Dubai.push(listing);
    } else if (listing.title && (listing.title.includes('Pakistan') || listing.title.includes('Karachi'))) {
      organized.Pakistani.push(listing);
    } else {
      organized.Other.push(listing);
    }
  });
  
  return organized;
}

/**
 * Test posting monthly target data at 2pm
 * @returns {Promise<Object>} Result of the test post
 */
async function testMonthlyTargetPost() {
  try {
    console.log('🧪 Testing monthly target post...');
    
    // Get current revenue data
    const revenueData = await getRevenueAndOccupancy();
    
    if (!revenueData.success) {
      return {
        success: false,
        error: 'Failed to fetch revenue data for test post'
      };
    }
    
    // Calculate revenue value
    const revenue = revenueData.monthlyTargetAchieved || revenueData.actualRevenue || 0;
    
    return {
      success: true,
      revenue,
      formatted: `Rs${Math.round(revenue / 1000)}K`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error in testMonthlyTargetPost:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear listings cache
 */
function clearListingsCache() {
  listingsCache = null;
  listingsCacheTimestamp = null;
  console.log('🗑️ Listings cache cleared');
}

/**
 * Initialize monthly target scheduler
 * This function sets up a cron job to post monthly targets at scheduled times
 */
function initializeMonthlyTargetScheduler() {
  try {
    console.log('🕐 Initializing monthly target scheduler...');
    
    // If node-cron is available, set up the scheduler
    try {
      const cron = require('node-cron');
      
      // Schedule for 2 PM every day (14:00 UTC)
      // Adjust timezone as needed based on your deployment
      cron.schedule('0 14 * * *', async () => {
        console.log('🕐 Running monthly target post at 2 PM...');
        
        try {
          const result = await testMonthlyTargetPost();
          if (result.success) {
            console.log('✅ Monthly target posted successfully');
          } else {
            console.error('❌ Failed to post monthly target:', result.error);
          }
        } catch (error) {
          console.error('❌ Error in scheduled monthly target post:', error.message);
        }
      });
      
      console.log('✅ Monthly target scheduler initialized');
    } catch (cronError) {
      console.warn('⚠️ node-cron not available, scheduler disabled');
    }
  } catch (error) {
    console.error('❌ Error initializing monthly target scheduler:', error.message);
  }
}

// Export all functions
module.exports = {
  getRevenueAndOccupancy,
  refreshListingsCache,
  fetchListingsData,
  testMonthlyTargetPost,
  clearListingsCache,
  fetchRevenueFromTeable,
  initializeMonthlyTargetScheduler
};
