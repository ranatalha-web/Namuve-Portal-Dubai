const express = require('express');
const router = express.Router();

// In-memory storage for overrides (in production, use database)
let cleaningStatusOverrides = {};

/**
 * GET /api/cleaning-status-overrides
 * Get all cleaning status overrides
 */
router.get('/', (req, res) => {
  try {
    console.log('📋 Fetching all cleaning status overrides');
    console.log('📊 Current overrides:', cleaningStatusOverrides);
    
    res.json({
      success: true,
      data: cleaningStatusOverrides,
      count: Object.keys(cleaningStatusOverrides).length,
      message: 'Cleaning status overrides retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching overrides:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch cleaning status overrides'
    });
  }
});

/**
 * POST /api/cleaning-status-overrides
 * Add or update a cleaning status override
 * Body: { listingId, hwStatus, hkStatus, reason }
 */
router.post('/', (req, res) => {
  try {
    const { listingId, hwStatus, hkStatus, reason } = req.body;
    
    if (!listingId || !hwStatus || !hkStatus) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: listingId, hwStatus, hkStatus',
        message: 'Invalid request body'
      });
    }
    
    console.log(`🔧 Adding/Updating override for listing ${listingId}`);
    console.log(`   HW Status: ${hwStatus}, HK Status: ${hkStatus}`);
    console.log(`   Reason: ${reason || 'No reason provided'}`);
    
    // Validate status values
    if (!['Clean', 'Not Clean'].includes(hwStatus) || !['Clean', 'Not Clean'].includes(hkStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status values. Must be "Clean" or "Not Clean"',
        message: 'Invalid status value'
      });
    }
    
    // Create override object
    const override = {
      listingId,
      hwStatus,
      hkStatus,
      cleannessStatus: hwStatus === 'Clean' ? 1 : 2,
      statusText: hwStatus === 'Clean' ? 'Clean ✅' : 'Not Clean ❌',
      reason: reason || 'Manual override',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store override
    cleaningStatusOverrides[listingId] = override;
    
    console.log(`✅ Override saved for listing ${listingId}`);
    
    res.json({
      success: true,
      data: override,
      message: `Cleaning status override added for listing ${listingId}`
    });
  } catch (error) {
    console.error('❌ Error adding override:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to add cleaning status override'
    });
  }
});

/**
 * DELETE /api/cleaning-status-overrides/:listingId
 * Remove a cleaning status override
 */
router.delete('/:listingId', (req, res) => {
  try {
    const { listingId } = req.params;
    
    console.log(`🗑️ Removing override for listing ${listingId}`);
    
    if (!cleaningStatusOverrides[listingId]) {
      return res.status(404).json({
        success: false,
        error: `No override found for listing ${listingId}`,
        message: 'Override not found'
      });
    }
    
    const removed = cleaningStatusOverrides[listingId];
    delete cleaningStatusOverrides[listingId];
    
    console.log(`✅ Override removed for listing ${listingId}`);
    
    res.json({
      success: true,
      data: removed,
      message: `Cleaning status override removed for listing ${listingId}`
    });
  } catch (error) {
    console.error('❌ Error removing override:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to remove cleaning status override'
    });
  }
});

/**
 * PUT /api/cleaning-status-overrides/:listingId
 * Update a cleaning status override
 */
router.put('/:listingId', (req, res) => {
  try {
    const { listingId } = req.params;
    const { hwStatus, hkStatus, reason } = req.body;
    
    console.log(`🔄 Updating override for listing ${listingId}`);
    
    if (!cleaningStatusOverrides[listingId]) {
      return res.status(404).json({
        success: false,
        error: `No override found for listing ${listingId}`,
        message: 'Override not found'
      });
    }
    
    // Validate status values if provided
    if (hwStatus && !['Clean', 'Not Clean'].includes(hwStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hwStatus. Must be "Clean" or "Not Clean"',
        message: 'Invalid status value'
      });
    }
    
    if (hkStatus && !['Clean', 'Not Clean'].includes(hkStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hkStatus. Must be "Clean" or "Not Clean"',
        message: 'Invalid status value'
      });
    }
    
    // Update override
    const override = cleaningStatusOverrides[listingId];
    if (hwStatus) override.hwStatus = hwStatus;
    if (hkStatus) override.hkStatus = hkStatus;
    if (reason) override.reason = reason;
    override.cleannessStatus = override.hwStatus === 'Clean' ? 1 : 2;
    override.statusText = override.hwStatus === 'Clean' ? 'Clean ✅' : 'Not Clean ❌';
    override.updatedAt = new Date().toISOString();
    
    console.log(`✅ Override updated for listing ${listingId}`);
    console.log(`   HW Status: ${override.hwStatus}, HK Status: ${override.hkStatus}`);
    
    res.json({
      success: true,
      data: override,
      message: `Cleaning status override updated for listing ${listingId}`
    });
  } catch (error) {
    console.error('❌ Error updating override:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to update cleaning status override'
    });
  }
});

/**
 * GET /api/cleaning-status-overrides/:listingId
 * Get a specific cleaning status override
 */
router.get('/:listingId', (req, res) => {
  try {
    const { listingId } = req.params;
    
    console.log(`🔍 Fetching override for listing ${listingId}`);
    
    const override = cleaningStatusOverrides[listingId];
    
    if (!override) {
      return res.status(404).json({
        success: false,
        error: `No override found for listing ${listingId}`,
        message: 'Override not found'
      });
    }
    
    res.json({
      success: true,
      data: override,
      message: `Cleaning status override retrieved for listing ${listingId}`
    });
  } catch (error) {
    console.error('❌ Error fetching override:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch cleaning status override'
    });
  }
});

module.exports = router;
