/**
 * Dubai Listing Revenue API Routes - TODAY LISTING REVENUE
 * Provides endpoints for Dubai listing revenue with category breakdown
 */

const express = require('express');
const router = express.Router();
const {
  fetchDubaiListingsData,
  refreshDubaiListingsCache,
  getDubaiRevenueAndOccupancy,
  getTodayDubaiListingRevenue,
  getDubaiListingsByCategory
} = require('../services/dubaiListingRevenue');

/**
 * GET /api/dubai-listing-revenue/health
 * Health check for Dubai Listing Revenue API
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dubai Listing Revenue API is healthy',
    service: 'Dubai Listing Revenue Service',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/dubai-listing-revenue/health',
      today: '/api/dubai-listing-revenue/today'
    }
  });
});

/**
 * GET /api/dubai-listing-revenue/today
 * Get today's Dubai listing revenue with category breakdown
 */
router.get('/today', async (req, res) => {
  try {
    console.log('📊 API REQUEST: GET /api/dubai-listing-revenue/today');
    console.log('🏙️ Calculating TODAY Dubai Listing Revenue...');
    
    const result = await getTodayDubaiListingRevenue();
    
    console.log('✅ Sending TODAY Dubai Listing Revenue response...');
    res.json({
      success: true,
      message: 'Today Dubai listing revenue calculated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in TODAY Dubai listing revenue route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate today Dubai listing revenue',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-listing-revenue/debug
 * Debug endpoint to check configuration
 */
router.get('/debug', (req, res) => {
  const config = require('../src/config/config');
  
  res.json({
    success: true,
    message: 'Dubai Listing Revenue Debug Info',
    config: {
      hasHostawayToken: !!config.HOSTAWAY_AUTH_TOKEN,
      tokenLength: config.HOSTAWAY_AUTH_TOKEN ? config.HOSTAWAY_AUTH_TOKEN.length : 0,
      exchangeRate: 279,
      nodeEnv: config.NODE_ENV
    },
    service: {
      name: 'Dubai Listing Revenue Service',
      categories: ['Studio', '1BR', '2BR'],
      features: ['Today Revenue', 'Category Breakdown', 'Listing Categorization']
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
