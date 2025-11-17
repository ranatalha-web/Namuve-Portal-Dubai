/**
 * Vercel Cron Job Endpoint for Dubai Daily Revenue Posting
 * This endpoint is called automatically by Vercel Cron every hour
 * Schedule: "0 * * * *" (at minute 0 of every hour)
 */

const { postDubaiDailyRevenue } = require('../services/dubaidailyteable');

/**
 * POST /api/cron/post-dubai-revenue
 * Vercel Cron Job Handler
 */
async function handler(req, res) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = req.headers.authorization;
  
  // In production, Vercel Cron adds: Authorization: Bearer <CRON_SECRET>
  // For security, you can verify the cron secret
  if (process.env.NODE_ENV === 'production') {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized cron request');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
  }

  try {
    console.log('\n========================================');
    console.log('⏰ VERCEL CRON JOB TRIGGERED');
    console.log('========================================');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Post Dubai daily revenue
    const result = await postDubaiDailyRevenue();
    
    if (result.success) {
      console.log('\n========================================');
      console.log('✅ CRON JOB COMPLETED SUCCESSFULLY');
      console.log('========================================');
      console.log(`💰 Daily Revenue: ${result.data.dailyRevenue} AED`);
      console.log(`📅 Date Time: ${result.data.dateTime}`);
      console.log(`📝 Record ID: ${result.data.recordId || 'N/A'}`);
      console.log('========================================\n');
      
      return res.status(200).json({
        success: true,
        message: 'Dubai daily revenue posted successfully',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('\n========================================');
      console.log('⚠️ CRON JOB COMPLETED WITH ERROR');
      console.log('========================================');
      console.log(`❌ Error: ${result.error}`);
      console.log('========================================\n');
      
      return res.status(400).json({
        success: false,
        message: 'Failed to post Dubai daily revenue',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ CRON JOB FAILED');
    console.error('========================================');
    console.error(`Error: ${error.message}`);
    console.error('========================================\n');
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;
