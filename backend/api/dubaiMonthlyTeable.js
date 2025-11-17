/**
 * Dubai Monthly Revenue Teable API Routes
 * Handles monthly revenue posting and management
 */

const express = require('express');
const router = express.Router();
const { 
  postMonthlyRevenue, 
  postMonthlyRevenueManual,
  fetchLatestDailyRevenue,
  fetchMonthlyRevenueRecords,
  fetchAllMonthlyRevenueRecords,
  calculateQuarterlyRevenue,
  checkIfMonthlyDataExists,
  getCurrentMonthRange
} = require('../services/dubaiMonthlyTeable');

/**
 * POST /api/dubai-monthly-teable/post
 * Post current month's total revenue to Monthly Revenue Actual table
 */
router.post('/post', async (req, res) => {
  try {
    console.log('\n🏙️ Monthly Revenue Posting Request Received');
    
    const result = await postMonthlyRevenue();
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('❌ Monthly revenue posting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during monthly revenue posting',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/dubai-monthly-teable/post-manual
 * Manually post monthly revenue for specific month/year
 * Body: { year: 2025, month: 11 }
 */
router.post('/post-manual', async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required',
        example: { year: 2025, month: 11 },
        timestamp: new Date().toISOString()
      });
    }
    
    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`\n🏙️ Manual Monthly Revenue Posting: ${year}-${month}`);
    
    const result = await postMonthlyRevenueManual(year, month);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error('❌ Manual monthly revenue posting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during manual monthly revenue posting',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-teable/calculate
 * Get latest daily revenue without posting (preview)
 */
router.get('/calculate', async (req, res) => {
  try {
    console.log('\n🏙️ Latest Revenue Calculation Request');
    
    const result = await fetchLatestDailyRevenue();
    
    if (result.success) {
      const { monthYear } = getCurrentMonthRange();
      
      res.status(200).json({
        success: true,
        message: 'Latest revenue retrieved successfully',
        data: {
          monthYear: monthYear,
          latestRevenue: result.latestRevenue.toFixed(2),
          latestDateTime: result.latestDateTime,
          sourceRecordId: result.recordId,
          totalDailyRecords: result.totalRecords
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get latest revenue',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Latest revenue calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during latest revenue calculation',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-teable/status
 * Check if monthly revenue has been posted for current month
 */
router.get('/status', async (req, res) => {
  try {
    console.log('\n🏙️ Monthly Revenue Status Check');
    
    const dataExists = await checkIfMonthlyDataExists();
    const { monthYear, firstDay, lastDay } = getCurrentMonthRange();
    
    res.status(200).json({
      success: true,
      message: 'Monthly revenue status retrieved',
      data: {
        monthYear: monthYear,
        dateRange: `${firstDay} to ${lastDay}`,
        alreadyPosted: dataExists,
        status: dataExists ? 'POSTED' : 'NOT_POSTED',
        nextAction: dataExists ? 'Wait for next month' : 'Ready to post'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Monthly revenue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during status check',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-teable/month-info
 * Get current month information and date ranges
 */
router.get('/month-info', async (req, res) => {
  try {
    const { monthYear, firstDay, lastDay } = getCurrentMonthRange();
    
    // Calculate days in month and current day
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const currentDay = pakistanTime.getUTCDate();
    const daysInMonth = new Date(pakistanTime.getUTCFullYear(), pakistanTime.getUTCMonth() + 1, 0).getDate();
    const isLastDay = currentDay === daysInMonth;
    
    res.status(200).json({
      success: true,
      message: 'Month information retrieved',
      data: {
        monthYear: monthYear,
        firstDay: firstDay,
        lastDay: lastDay,
        currentDay: currentDay,
        daysInMonth: daysInMonth,
        isLastDay: isLastDay,
        pakistanTime: pakistanTime.toISOString(),
        readyForMonthlyPosting: isLastDay
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Month info error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during month info retrieval',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-teable/quarterly
 * Calculate and return quarterly revenue data
 */
router.get('/quarterly', async (req, res) => {
  try {
    console.log('\n🏙️ Quarterly Revenue Calculation Request');
    
    const result = await calculateQuarterlyRevenue();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Quarterly revenue calculated successfully',
        data: result.data,
        timestamp: result.timestamp
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to calculate quarterly revenue',
        error: result.error,
        timestamp: result.timestamp
      });
    }
    
  } catch (error) {
    console.error('❌ Quarterly revenue calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during quarterly revenue calculation',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-teable/records
 * Fetch all monthly revenue records from Teable
 */
router.get('/records', async (req, res) => {
  try {
    console.log('\n🏙️ Monthly Revenue Records Fetch Request');
    
    const result = await fetchMonthlyRevenueRecords();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Monthly revenue records retrieved successfully',
        data: result.data,
        timestamp: result.timestamp
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch monthly revenue records',
        error: result.error,
        timestamp: result.timestamp
      });
    }
    
  } catch (error) {
    console.error('❌ Monthly revenue records fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during monthly revenue records fetch',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/dubai-monthly-teable/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dubai Monthly Revenue Teable API is healthy',
    service: 'Dubai Monthly Teable Service',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
