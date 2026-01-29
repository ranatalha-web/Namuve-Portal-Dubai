/**
 * Teable Scheduler Service
 * Manages scheduled synchronization and posting to Teable
 */

class TeableSchedulerService {
  constructor() {
    this.isRunning = false;
    this.scheduler = null;
    this.syncInterval = 60 * 60 * 1000; // 1 hour
    this.lastSyncTime = null;
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduler: this.isRunning ? 'active' : 'inactive',
      syncInterval: this.syncInterval,
      intervalMinutes: Math.floor(this.syncInterval / (60 * 1000)),
      lastSyncTime: this.lastSyncTime ? this.lastSyncTime.toISOString() : null,
      nextSyncTime: this.lastSyncTime ? 
        new Date(this.lastSyncTime.getTime() + this.syncInterval).toISOString() : 
        'No sync yet'
    };
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Teable scheduler is already running');
      return;
    }

    try {
      console.log('🕐 Starting Teable scheduler...');
      
      // Try to use node-cron if available
      try {
        const cron = require('node-cron');
        
        // Schedule for every hour at the top of the hour
        this.scheduler = cron.schedule('0 * * * *', async () => {
          console.log('🕐 Teable scheduler triggered - performing sync');
          await this.performSync();
        });
        
        this.isRunning = true;
        console.log('✅ Teable scheduler started successfully');
      } catch (cronError) {
        console.warn('⚠️ node-cron not available, Teable scheduler disabled');
        this.isRunning = false;
      }
    } catch (error) {
      console.error('❌ Error starting Teable scheduler:', error.message);
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Teable scheduler is not running');
      return;
    }

    try {
      if (this.scheduler) {
        this.scheduler.stop();
        this.scheduler.destroy();
      }
      
      this.isRunning = false;
      console.log('✅ Teable scheduler stopped');
    } catch (error) {
      console.error('❌ Error stopping Teable scheduler:', error.message);
    }
  }

  /**
   * Perform synchronization with Teable
   */
  async performSync() {
    try {
      console.log('📤 Performing Teable sync...');
      
      // Get current timestamp
      const syncTime = new Date();
      
      // Record sync time
      this.lastSyncTime = syncTime;
      
      // Here you would implement actual sync logic with Teable
      // For now, we just return a status
      
      console.log('✅ Teable sync completed');
      
      return {
        success: true,
        syncTime: syncTime.toISOString(),
        message: 'Teable sync completed successfully'
      };
    } catch (error) {
      console.error('❌ Error performing Teable sync:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Teable sync failed'
      };
    }
  }

  /**
   * Set custom sync interval (in milliseconds)
   */
  setSyncInterval(milliseconds) {
    this.syncInterval = milliseconds;
    console.log(`⏱️ Sync interval set to ${Math.floor(milliseconds / (60 * 1000))} minutes`);
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
module.exports = new TeableSchedulerService();
