const express = require('express');
const router = express.Router();
const hostawayCleaningStatusService = require('../services/hostawayCleaningStatusService');

/**
 * GET /api/hostaway/cleaning-status/dubai
 * Get all Dubai listings with their cleaning status from Hostaway
 */
router.get('/dubai', async (req, res) => {
  try {
    console.log('\n🏨 ========== API ENDPOINT: /api/hostaway/cleaning-status/dubai ==========');
    console.log(`🔵 DEBUG: Request received at ${new Date().toISOString()}`);
    console.log(`🔵 DEBUG: Request method: ${req.method}`);
    console.log(`🔵 DEBUG: Request URL: ${req.originalUrl}`);
    console.log(`🔵 DEBUG: Calling hostawayCleaningStatusService.getDubaiListingsCleaningStatus()...`);
    
    const dubaiListings = await hostawayCleaningStatusService.getDubaiListingsCleaningStatus();
    
    console.log(`\n✅ API: Service returned ${dubaiListings.length} Dubai listings`);
    console.log(`🔵 DEBUG: Response data type: ${typeof dubaiListings}`);
    console.log(`🔵 DEBUG: Response is array: ${Array.isArray(dubaiListings)}`);
    
    console.log(`\n📤 API RESPONSE: Preparing to send ${dubaiListings.length} Dubai listings to frontend`);
    
    if (dubaiListings.length > 0) {
      console.log(`🔵 DEBUG: First 5 listings:`);
      dubaiListings.slice(0, 5).forEach((listing, index) => {
        console.log(`   ${index + 1}. ${listing.internalListingName}`);
        console.log(`      ├─ ID: ${listing.listingId}`);
        console.log(`      ├─ Cleanness: ${listing.cleannessStatus}`);
        console.log(`      ├─ HW: ${listing.hwStatus}`);
        console.log(`      └─ HK: ${listing.hkStatus}`);
      });
      if (dubaiListings.length > 5) {
        console.log(`   ... and ${dubaiListings.length - 5} more listings`);
      }
    } else {
      console.warn(`🔴 WARNING: No listings returned from service`);
    }
    
    const responsePayload = {
      success: true,
      data: dubaiListings,
      count: dubaiListings.length,
      message: 'Dubai listings cleaning status fetched successfully',
      timestamp: new Date().toISOString()
    };
    
    console.log(`🔵 DEBUG: Response payload size: ${JSON.stringify(responsePayload).length} bytes`);
    console.log(`✅ API: Sending response with ${dubaiListings.length} listings`);
    console.log(`🏨 ========== END API ENDPOINT CALL ==========\n`);
    
    res.json(responsePayload);
  } catch (error) {
    console.error('❌ API ERROR: Exception caught in /dubai endpoint');
    console.error(`❌ ERROR Message: ${error.message}`);
    console.error(`❌ ERROR Stack: ${error.stack}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch cleaning status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/hostaway/cleaning-status/summary
 * Get cleaning status summary for dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('📊 API: Fetching cleaning status summary...');
    
    const summary = await hostawayCleaningStatusService.getCleaningStatusSummary();
    
    res.json({
      success: true,
      data: summary,
      message: 'Cleaning status summary fetched successfully'
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch cleaning status summary'
    });
  }
});

/**
 * GET /api/hostaway/cleaning-status/debug-report
 * Get comprehensive debug report with apartment names and cleaning status
 */
router.get('/debug-report', async (req, res) => {
  try {
    console.log('\n🔍 DEBUG REPORT ENDPOINT CALLED');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    const report = await hostawayCleaningStatusService.getComprehensiveDebugReport();
    
    if (report) {
      console.log(`✅ Debug report generated successfully with ${report.total} listings`);
      res.json({
        success: true,
        data: report,
        message: 'Comprehensive debug report generated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate debug report',
        message: 'Could not generate comprehensive debug report'
      });
    }
  } catch (error) {
    console.error('❌ DEBUG REPORT ERROR:', error.message);
    console.error('❌ ERROR Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate debug report'
    });
  }
});

/**
 * GET /api/hostaway/cleaning-status/listing/:id
 * Get cleaning status for a specific listing
 */
router.get('/listing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🏠 API: Fetching cleaning status for listing ${id}...`);
    
    const cleaningStatus = await hostawayCleaningStatusService.getListingCleaningStatus(id);
    
    if (cleaningStatus) {
      res.json({
        success: true,
        data: cleaningStatus,
        message: 'Cleaning status fetched successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Listing not found',
        message: 'Could not fetch cleaning status for this listing'
      });
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch cleaning status'
    });
  }
});

module.exports = router;
