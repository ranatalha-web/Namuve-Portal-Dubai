/**
 * Dubai Revenue Routes - No Database
 * Direct API routes for Dubai revenue data
 */

const express = require('express');
const router = express.Router();
const dubaiRevenueService = require('../services/dubaiRevenueService');

/**
 * GET /api/dubai-revenue
 * Get Dubai revenue data
 */
router.get('/', async (req, res) => {
  try {
    // Use process.stdout.write to bypass any console overrides
    process.stdout.write('\n🌐 ========================================\n');
    process.stdout.write('📊 API REQUEST: GET /api/dubai-revenue\n');
    process.stdout.write('🌐 ========================================\n\n');
    
    console.log('\n🌐 ========================================');
    console.log('📊 API REQUEST: GET /api/dubai-revenue');
    console.log('🌐 ========================================\n');
    
    const result = await dubaiRevenueService.getDubaiRevenue();
    
    process.stdout.write('✅ Sending response to client...\n\n');
    console.log('✅ Sending response to client...\n');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error in Dubai revenue route:', error);
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
    console.log('📊 API Request: GET /api/dubai-revenue/listings');
    
    const listings = await dubaiRevenueService.fetchDubaiListings();
    
    res.json({
      success: true,
      listings: listings.map(listing => ({
        id: listing.id,
        name: listing.name,
        city: listing.city,
        country: listing.country,
        address: listing.address
      })),
      total: listings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching Dubai listings:', error);
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
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dubai Revenue API is healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      revenue: '/api/dubai-revenue',
      listings: '/api/dubai-revenue/listings',
      health: '/api/dubai-revenue/health'
    }
  });
});

module.exports = router;
