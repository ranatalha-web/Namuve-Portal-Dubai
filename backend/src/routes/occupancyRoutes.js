const express = require('express');
const router = express.Router();
const occupancyService = require('../../services/occupancy');

/**
 * GET /api/occupancy/current
 * Get current occupancy data and report
 */
router.get('/current', async (req, res) => {
  try {
    console.log('🏨 API: Fetching current occupancy data...');
    
    const result = await occupancyService.getCurrentOccupancy();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        report: result.report,
        message: 'Occupancy data retrieved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to fetch occupancy data'
      });
    }
  } catch (error) {
    console.error('❌ Occupancy API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/occupancy/health
 * Health check for occupancy service
 */
router.get('/health', async (req, res) => {
  try {
    const hasToken = !!process.env.TEABLE_BEARER_TOKEN;
    
    res.json({
      success: true,
      status: 'healthy',
      teableConfigured: hasToken,
      timestamp: new Date().toISOString(),
      message: hasToken ? 'Occupancy service ready' : 'TEABLE_BEARER_TOKEN not configured'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/occupancy/report
 * Get formatted occupancy report text
 */
router.get('/report', async (req, res) => {
  try {
    console.log('📊 API: Generating occupancy report...');
    
    const result = await occupancyService.getCurrentOccupancy();
    
    if (result.success) {
      res.json({
        success: true,
        report: result.report,
        data: result.data,
        message: 'Occupancy report generated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to generate occupancy report'
      });
    }
  } catch (error) {
    console.error('❌ Occupancy Report API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/occupancy/today-checkins
 * Get detailed information about today's check-ins
 */
router.get('/today-checkins', async (req, res) => {
  try {
    console.log('📋 API: Fetching today\'s check-ins details...');
    
    const result = await occupancyService.getTodayCheckinsDetails();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Today\'s check-ins retrieved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to fetch today\'s check-ins'
      });
    }
  } catch (error) {
    console.error('❌ Today\'s Check-ins API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
