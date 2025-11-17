/**
 * Dubai Daily Teable API Routes
 * Endpoints for posting Dubai daily revenue to Teable
 */

const express = require('express');
const router = express.Router();
const {
  postDubaiDailyRevenue,
  postSpecificDubaiRevenue,
  getPostingStatus,
  checkIfDataExistsForCurrentHour
} = require('../services/dubaidailyteable');

/**
 * POST /api/dubai-daily-teable/post
 * Post current Dubai daily revenue to Teable
 */
router.post('/post', async (req, res) => {
  try {
    console.log('📥 POST /api/dubai-daily-teable/post - Posting Dubai daily revenue');
    
    const result = await postDubaiDailyRevenue();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error in POST /post:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/dubai-daily-teable/post-specific
 * Post specific Dubai revenue values (manual override)
 * Body: { dailyRevenue: number, dateTime?: string }
 */
router.post('/post-specific', async (req, res) => {
  try {
    const { dailyRevenue, dateTime } = req.body;
    
    if (!dailyRevenue) {
      return res.status(400).json({
        success: false,
        error: 'dailyRevenue is required'
      });
    }

    console.log('📥 POST /api/dubai-daily-teable/post-specific - Manual posting');
    console.log(`   Daily Revenue: ${dailyRevenue} AED`);
    if (dateTime) {
      console.log(`   Date Time: ${dateTime}`);
    }
    
    const result = await postSpecificDubaiRevenue(dailyRevenue, dateTime);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error in POST /post-specific:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-daily-teable/status
 * Get posting status (check if can post in current hour)
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📥 GET /api/dubai-daily-teable/status - Checking posting status');
    
    const result = await getPostingStatus();
    res.json(result);
  } catch (error) {
    console.error('❌ Error in GET /status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-daily-teable/check-hour
 * Debug endpoint to check if data exists for current hour
 */
router.get('/check-hour', async (req, res) => {
  try {
    console.log('📥 GET /api/dubai-daily-teable/check-hour - Checking current hour');
    
    const exists = await checkIfDataExistsForCurrentHour();
    
    res.json({
      success: true,
      dataExistsForCurrentHour: exists,
      message: exists 
        ? 'Data already posted for current hour'
        : 'No data for current hour - can post'
    });
  } catch (error) {
    console.error('❌ Error in GET /check-hour:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-daily-teable/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Dubai Daily Teable Service',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
