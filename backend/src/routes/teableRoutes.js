const express = require('express');
const router = express.Router();
const schedulerService = require('../services/schedulerService');

/**
 * GET /api/teable/status
 * Get scheduler status
 */
router.get('/status', async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/start
 * Start the hourly scheduler
 */
router.post('/start', async (req, res) => {
  try {
    schedulerService.start();
    const status = schedulerService.getStatus();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully',
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/stop
 * Stop the hourly scheduler
 */
router.post('/stop', async (req, res) => {
  try {
    schedulerService.stop();
    const status = schedulerService.getStatus();
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully',
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/reset-cooldown
 * Reset posting cooldown for testing
 */
router.post('/reset-cooldown', async (req, res) => {
  try {
    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    teableService.resetCooldown();
    
    res.json({
      success: true,
      message: 'Posting cooldown reset - can post immediately',
      data: {
        canPost: true,
        remainingMinutes: 0,
        lastPostedTime: null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/teable/posting-status
 * Check if posting is allowed and get remaining time
 */
router.get('/posting-status', async (req, res) => {
  try {
    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    const canPost = teableService.canPostNow();
    const remainingMinutes = teableService.getTimeUntilNextPost();
    const pakistanDateTime = teableService.getPakistanDateTime();
    
    res.json({
      success: true,
      data: {
        canPost: canPost,
        remainingMinutes: remainingMinutes,
        currentPakistanTime: pakistanDateTime,
        lastPostedTime: teableService.lastPostedTime ? teableService.lastPostedTime.toISOString() : null,
        nextAllowedTime: teableService.lastPostedTime ? 
          new Date(teableService.lastPostedTime.getTime() + (60 * 60 * 1000)).toISOString() : 
          'Now'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/test-connection
 * Test connection to Teable API
 */
router.post('/test-connection', async (req, res) => {
  try {
    const result = await schedulerService.testTeableConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Teable connection test successful',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Teable connection test failed',
        error: result.message,
        data: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/manual-post
 * Manually trigger data posting to Teable (for testing)
 */
router.post('/manual-post', async (req, res) => {
  try {
    const result = await schedulerService.triggerManualPost();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Data posted to Teable successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to post data to Teable',
        error: result.error,
        data: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/post-specific
 * Post specific values to Teable
 */
router.post('/post-specific', async (req, res) => {
  try {
    const { actual, achieved } = req.body;
    
    if (!actual || !achieved) {
      return res.status(400).json({
        success: false,
        error: 'Both actual and achieved values are required'
      });
    }

    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    const result = await teableService.postTargetData({
      actual: actual,
      achieved: achieved
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Specific values posted to Teable successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to post specific values to Teable',
        error: result.error,
        data: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/teable/records
 * Get all records from Teable
 */
router.get('/records', async (req, res) => {
  try {
    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    const result = await teableService.getAllRecords();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Records fetched successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch records',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/teable/records/:recordId
 * Delete a specific record from Teable
 */
router.delete('/records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    const result = await teableService.deleteRecord(recordId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Record deleted successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete record',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/post-fixed-actual-dynamic-achieved
 * Post fixed actual (Rs583K) with dynamic achieved value from current revenue
 */
router.post('/post-fixed-actual-dynamic-achieved', async (req, res) => {
  try {
    const { getRevenueAndOccupancy } = require('../services/revenueService');
    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    // Fetch current revenue data
    const revenueData = await getRevenueAndOccupancy();
    
    if (!revenueData) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch current revenue data'
      });
    }
    
    // Format the achieved value (using total revenue instead of expected)
    const totalRevenue = parseFloat(revenueData.totalRevenue) || 0;
    let achievedFormatted = "";
    
    if (totalRevenue >= 1000000) {
      achievedFormatted = `Rs${(totalRevenue / 1000000).toFixed(1)}M`;
    } else if (totalRevenue >= 1000) {
      achievedFormatted = `Rs${Math.round(totalRevenue / 1000)}K`;
    } else {
      achievedFormatted = `Rs${Math.round(totalRevenue)}`;
    }
    
    // Delete all existing records first
    const recordsResult = await teableService.getAllRecords();
    
    if (recordsResult.success) {
      const records = recordsResult.data.records || [];
      const deletePromises = records.map(record => 
        teableService.deleteRecord(record.id)
      );
      await Promise.all(deletePromises);
      console.log(`🗑️ Deleted ${records.length} existing records`);
    }
    
    // Post new values with fixed actual and dynamic achieved
    const postResult = await teableService.postTargetData({
      actual: "Rs583K", // Fixed value
      achieved: achievedFormatted // Dynamic value from current revenue
    });
    
    if (postResult.success) {
      res.json({
        success: true,
        message: 'Posted fixed actual with dynamic achieved value',
        data: {
          actual: "Rs583K",
          achieved: achievedFormatted,
          totalRevenue: revenueData.totalRevenue,
          expectedRevenue: revenueData.expectedRevenue,
          actualRevenue: revenueData.actualRevenue,
          postResult: postResult.data
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to post values to Teable',
        error: postResult.error
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/teable/debug-hour-check
 * Debug the hour checking logic
 */
router.get('/debug-hour-check', async (req, res) => {
  try {
    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    const pakistanDateTime = teableService.getPakistanDateTime();
    
    // Extract hour using ISO format logic: "2025-10-06T10:00:17.449Z"
    const currentDate = new Date(pakistanDateTime);
    const currentHour = currentDate.getUTCHours();
    const currentDay = currentDate.getUTCDate();
    const currentMonth = currentDate.getUTCMonth();
    const currentYear = currentDate.getUTCFullYear();
    const currentHourString = `${currentYear}-${(currentMonth+1).toString().padStart(2,'0')}-${currentDay.toString().padStart(2,'0')} ${currentHour}:00`;
    
    // Get all records to show comparison
    const recordsResult = await teableService.getAllRecords();
    let existingHours = [];
    
    if (recordsResult.success && recordsResult.data.records) {
      existingHours = recordsResult.data.records.map(record => {
        const recordDateTime = record.fields['Date and Time '];
        if (!recordDateTime) return 'No DateTime';
        
        // Parse ISO format from existing record
        const recordDate = new Date(recordDateTime);
        const recordHour = recordDate.getUTCHours();
        const recordDay = recordDate.getUTCDate();
        const recordMonth = recordDate.getUTCMonth();
        const recordYear = recordDate.getUTCFullYear();
        const recordHourString = `${recordYear}-${(recordMonth+1).toString().padStart(2,'0')}-${recordDay.toString().padStart(2,'0')} ${recordHour}:00`;
        
        const matchesCurrent = recordHour === currentHour && 
                              recordDay === currentDay && 
                              recordMonth === currentMonth && 
                              recordYear === currentYear;
        
        return {
          original: recordDateTime,
          extracted: recordHourString,
          matchesCurrent: matchesCurrent
        };
      });
    }
    
    res.json({
      success: true,
      data: {
        currentPakistanDateTime: pakistanDateTime,
        extractedCurrentHour: currentHourString,
        existingRecords: existingHours,
        hasMatchingHour: existingHours.some(h => h.matchesCurrent)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/teable/replace-with-specific
 * Delete all existing records and post specific values
 */
router.post('/replace-with-specific', async (req, res) => {
  try {
    const { actual, achieved } = req.body;
    
    if (!actual || !achieved) {
      return res.status(400).json({
        success: false,
        error: 'Both actual and achieved values are required'
      });
    }

    const TeableService = require('../services/teableService');
    const teableService = new TeableService();
    
    // First, get all existing records
    const recordsResult = await teableService.getAllRecords();
    
    if (!recordsResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch existing records',
        error: recordsResult.error
      });
    }

    // Delete all existing records
    const records = recordsResult.data.records || [];
    const deletePromises = records.map(record => 
      teableService.deleteRecord(record.id)
    );
    
    await Promise.all(deletePromises);
    console.log(`🗑️ Deleted ${records.length} existing records`);
    
    // Post new specific values
    const postResult = await teableService.postTargetData({
      actual: actual,
      achieved: achieved
    });
    
    if (postResult.success) {
      res.json({
        success: true,
        message: `Replaced ${records.length} records with new specific values`,
        data: {
          deletedCount: records.length,
          newRecord: postResult.data
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to post new values after deletion',
        error: postResult.error
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/teable/monthly-revenue
 * Fetch all monthly revenue records from Teable and sum them
 */
router.get('/monthly-revenue', async (req, res) => {
  try {
    const dubaiMonthlyTeableService = require('../../services/dubaiMonthlyTeable');
    
    console.log('📊 API REQUEST: GET /api/teable/monthly-revenue');
    
    const result = await dubaiMonthlyTeableService.fetchMonthlyRevenueRecords();
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error fetching monthly revenue:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/teable/quarterly-revenue
 * Calculate quarterly revenue from monthly records
 */
router.get('/quarterly-revenue', async (req, res) => {
  try {
    const dubaiMonthlyTeableService = require('../../services/dubaiMonthlyTeable');
    
    console.log('📊 API REQUEST: GET /api/teable/quarterly-revenue');
    
    const result = await dubaiMonthlyTeableService.calculateQuarterlyRevenue();
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error calculating quarterly revenue:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
