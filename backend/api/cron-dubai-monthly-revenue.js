/**
 * Vercel Cron Job Handler for Dubai Monthly Revenue
 * Runs at 11:59 PM on the last day of each month (Pakistan time)
 * Sums all daily revenue for the month and posts to Monthly Revenue Actual table
 */

const { postMonthlyRevenue } = require('../services/dubaiMonthlyTeable');

/**
 * Vercel Cron Job Handler
 * This function is called by Vercel's cron job system
 */
async function cronDubaiMonthlyRevenueHandler(req, res) {
  try {
    console.log('\n========================================');
    console.log('⏰ VERCEL MONTHLY CRON JOB TRIGGERED');
    console.log('========================================');
    console.log('📅 Time:', new Date().toISOString());
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    
    // Get current date info for logging
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const currentDay = pakistanTime.getUTCDate();
    const currentMonth = pakistanTime.getUTCMonth();
    const currentYear = pakistanTime.getUTCFullYear();
    
    console.log(`📅 Current Pakistan Date: ${pakistanTime.toISOString()}`);
    console.log(`📅 Current Day: ${currentDay}`);
    console.log('✅ Proceeding with monthly revenue posting...');
    
    // Call the monthly revenue posting service
    const result = await postMonthlyRevenue();
    
    if (result.success) {
      console.log('✅ Monthly cron job completed successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Monthly cron job executed successfully',
        cronJob: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('⚠️ Monthly cron job completed with error');
      
      return res.status(400).json({
        success: false,
        message: 'Monthly cron job failed',
        cronJob: true,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Monthly cron job error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Monthly cron job internal error',
      cronJob: true,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    console.log('\n========================================');
    console.log('⏰ MONTHLY CRON JOB COMPLETED');
    console.log('========================================');
  }
}

module.exports = cronDubaiMonthlyRevenueHandler;
