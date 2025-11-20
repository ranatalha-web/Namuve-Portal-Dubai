/**
 * Dubai Payment Database Routes
 * Fast endpoints that fetch from Teable database (no Hostaway calls)
 */

const express = require('express');
const router = express.Router();
const {
  fetchPaymentDetailsFromDatabase,
  fetchAchievedRevenueFromDatabase,
  fetchListingRevenueFromDatabase
} = require('../../api/dubaiPaymentDatabase');

/**
 * GET /api/dubai-payment/database/details
 * Fetch payment details from Teable database (FAST - no Hostaway)
 */
router.get('/database/details', async (req, res) => {
  try {
    console.log('🔄 API call: GET /api/dubai-payment/database/details');
    
    const result = await fetchPaymentDetailsFromDatabase();
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error fetching payment details from database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details from database',
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-revenue/database/achieved
 * Fetch achieved revenue from Teable database (FAST - no Hostaway)
 */
router.get('/database/achieved', async (req, res) => {
  try {
    console.log('🔄 API call: GET /api/dubai-revenue/database/achieved');
    
    const result = await fetchAchievedRevenueFromDatabase();
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error fetching achieved revenue from database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achieved revenue from database',
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-revenue/database/listing
 * Fetch listing revenue from Teable database (FAST - no Hostaway)
 */
router.get('/database/listing', async (req, res) => {
  try {
    console.log('🔄 API call: GET /api/dubai-revenue/database/listing');
    
    const result = await fetchListingRevenueFromDatabase();
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error fetching listing revenue from database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch listing revenue from database',
      error: error.message
    });
  }
});

module.exports = router;
