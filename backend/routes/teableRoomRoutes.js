const express = require('express');
const router = express.Router();
const TeableRoomReservationService = require('../api/new-teable_room');

// Initialize service
const teableRoomService = new TeableRoomReservationService();

/**
 * POST /api/teable-room/sync
 * Syncs all yesterday/today reservation data from Hostaway to Teable
 * Deletes existing records, fetches from Hostaway, posts to Teable
 */
router.post('/sync', async (req, res) => {
  try {
    console.log('🔄 Sync endpoint called');
    const result = await teableRoomService.syncAllData();
    
    res.json(result);
  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/teable-room/all
 * Fetches all records from Teable database
 * Frontend calls this to get reservation data (fast, <5 seconds)
 */
router.get('/all', async (req, res) => {
  try {
    console.log('📖 Get all records endpoint called');
    const result = await teableRoomService.getAllRecords();
    
    res.json(result);
  } catch (error) {
    console.error('❌ Get all error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * POST /api/teable-room/delete-all
 * Deletes all records from Teable (for testing/cleanup)
 */
router.post('/delete-all', async (req, res) => {
  try {
    console.log('🗑️ Delete all endpoint called');
    const result = await teableRoomService.deleteAllRecords();
    
    res.json({
      success: result,
      message: result ? 'All records deleted' : 'Failed to delete records'
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
