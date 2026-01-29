/**
 * Scheduler Service
 * Manages scheduling of Teable posting tasks and provides test utilities
 */

const TeableService = require('./teableService');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.teableService = new TeableService();
    this.scheduler = null;
    this.postInterval = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * Get current scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduler: this.isRunning ? 'active' : 'inactive',
      postInterval: this.postInterval,
      intervalMinutes: Math.floor(this.postInterval / (60 * 1000)),
      lastPostedTime: this.teableService.lastPostedTime ? this.teableService.lastPostedTime.toISOString() : null,
      canPostNow: this.teableService.canPostNow(),
      nextPostAllowedIn: this.teableService.getTimeUntilNextPost()
    };
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return {
        success: false,
        message: 'Scheduler is already running'
      };
    }

    try {
      console.log('🕐 Starting hourly scheduler...');
      
      // Try to use node-cron if available
      try {
        const cron = require('node-cron');
        
        // Schedule for every hour at the top of the hour
        this.scheduler = cron.schedule('0 * * * *', async () => {
          console.log('🕐 Hourly scheduler triggered');
          await this.triggerManualPost();
        });
        
        this.isRunning = true;
        console.log('✅ Scheduler started successfully');
        
        return {
          success: true,
          message: 'Scheduler started successfully'
        };
      } catch (cronError) {
        console.warn('⚠️ node-cron not available, scheduler disabled');
        this.isRunning = false;
        
        return {
          success: false,
          message: 'node-cron not available'
        };
      }
    } catch (error) {
      console.error('❌ Error starting scheduler:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return {
        success: false,
        message: 'Scheduler is not running'
      };
    }

    try {
      if (this.scheduler) {
        this.scheduler.stop();
        this.scheduler.destroy();
      }
      
      this.isRunning = false;
      console.log('✅ Scheduler stopped');
      
      return {
        success: true,
        message: 'Scheduler stopped successfully'
      };
    } catch (error) {
      console.error('❌ Error stopping scheduler:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Test connection to Teable API
   */
  async testTeableConnection() {
    try {
      console.log('🔗 Testing Teable connection...');
      const result = await this.teableService.testConnection();
      
      return {
        success: result.success,
        message: result.message || result.error,
        timestamp: result.timestamp
      };
    } catch (error) {
      console.error('❌ Error testing connection:', error.message);
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Manually trigger a post to Teable
   */
  async triggerManualPost() {
    try {
      console.log('📤 Manually triggering Teable post...');
      
      // Check if we can post
      if (!this.teableService.canPostNow()) {
        const remaining = this.teableService.getTimeUntilNextPost();
        return {
          success: false,
          error: `Cooldown in effect. Can post again in ${remaining} minutes.`,
          canPost: false,
          remainingMinutes: remaining
        };
      }

      // Get Pakistan time
      const pakTime = this.teableService.getPakistanDateTime();
      
      // Create sample data
      const sampleData = {
        actual: 583000, // Rs 583K
        achieved: Math.floor(Math.random() * 1000000) // Random achieved value
      };

      const result = await this.teableService.postTargetData(sampleData);
      
      return {
        success: result.success,
        message: result.success ? 'Data posted successfully' : 'Failed to post data',
        data: {
          recordId: result.recordId,
          postedAt: result.postedAt,
          pakistanTime: pakTime,
          nextPostAllowedIn: this.teableService.getTimeUntilNextPost()
        },
        error: result.error
      };

    } catch (error) {
      console.error('❌ Error in manual post:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set custom post interval (in milliseconds)
   */
  setPostInterval(milliseconds) {
    this.postInterval = milliseconds;
    console.log(`⏱️ Post interval set to ${Math.floor(milliseconds / (60 * 1000))} minutes`);
  }

  /**
   * Destroy scheduler instance
   */
  destroy() {
    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler.destroy();
    }
    this.isRunning = false;
  }
}

// Export singleton instance
module.exports = new SchedulerService();
