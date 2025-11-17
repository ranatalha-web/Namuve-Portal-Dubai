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
    
    // Check if it's actually the last day of the month
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const currentDay = pakistanTime.getUTCDate();
    const currentMonth = pakistanTime.getUTCMonth();
    const currentYear = pakistanTime.getUTCFullYear();
    
    // Get last day of current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const isLastDay = currentDay === lastDayOfMonth;
    
    console.log(`📅 Current Pakistan Date: ${pakistanTime.toISOString()}`);
    console.log(`📅 Current Day: ${currentDay}, Last Day of Month: ${lastDayOfMonth}`);
    console.log(`📅 Is Last Day: ${isLastDay}`);
    
    if (!isLastDay) {
      const message = `Not the last day of month. Current day: ${currentDay}, Last day: ${lastDayOfMonth}`;
      console.log(`⚠️ ${message}`);
      
      return res.status(200).json({
        success: false,
        message: message,
        data: {
          currentDay: currentDay,
          lastDayOfMonth: lastDayOfMonth,
          isLastDay: isLastDay,
          nextRun: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${lastDayOfMonth} 23:59:00`
        },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Confirmed: Last day of month - proceeding with monthly revenue posting');
    
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
