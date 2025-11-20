const express = require('express');
const router = express.Router();

// Lazy load the functions to avoid import errors
let storeDailyRevenue, getDailyRevenue, getAllRevenue;

try {
  const dubaiRevenueModule = require('../api/dubaiRevenue');
  storeDailyRevenue = dubaiRevenueModule.storeDailyRevenue;
  getDailyRevenue = dubaiRevenueModule.getDailyRevenue;
  getAllRevenue = dubaiRevenueModule.getAllRevenue;
  console.log('✅ Dubai Revenue module loaded successfully');
} catch (error) {
  console.error('❌ Error loading Dubai Revenue module:', error.message);
}

// Test route to verify router is loaded
router.get('/test', (req, res) => {
  console.log('✅ Dubai Revenue Router Test Route Hit');
  res.json({ success: true, message: 'Dubai Revenue Router is working!' });
});

/**
 * POST /api/dubai-revenue/store
 * Store or update daily revenue
 * Body: { dailyAchieved, monthlyAchieved, quarterlyAchieved }
 * MUST BE BEFORE GET /:date to avoid route matching conflict
 */
router.post('/store', async (req, res) => {
  try {
    const { dailyAchieved, monthlyAchieved, quarterlyAchieved } = req.body;
    
    console.log(`📤 POST /store received:`, { dailyAchieved, monthlyAchieved, quarterlyAchieved });
    
    if (dailyAchieved === undefined && monthlyAchieved === undefined && quarterlyAchieved === undefined) {
      return res.status(400).json({
        success: false,
        error: 'At least one revenue value is required'
      });
    }

    if (!storeDailyRevenue) {
      return res.status(500).json({
        success: false,
        error: 'storeDailyRevenue function not available'
      });
    }

    const result = await storeDailyRevenue({
      dailyAchieved,
      monthlyAchieved,
      quarterlyAchieved
    });

    console.log(`✅ POST /store result:`, result);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(`❌ POST /store error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-revenue/today
 * Retrieve today's revenue from Teable database
 */
router.get('/today', async (req, res) => {
  try {
    const result = await getDailyRevenue();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-revenue/:date
 * Retrieve revenue for a specific date (YYYY-MM-DD format)
 */
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const result = await getDailyRevenue(date);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-revenue
 * Retrieve all revenue records
 */
router.get('/', async (req, res) => {
  try {
    const result = await getAllRevenue();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
