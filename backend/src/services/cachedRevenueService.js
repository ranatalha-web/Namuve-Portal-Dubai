const axios = require('axios');
const revenueService = require('./revenueService');

/**
 * Cached Revenue Service
 * Provides caching layer for revenue data with configurable TTL
 */

class CachedRevenueService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes default
    this.isRefreshing = false;
  }

  /**
   * Get revenue data with caching
   * @returns {Promise<Object>} Revenue data with cache metadata
   */
  async getRevenueData() {
    try {
      const now = Date.now();
      
      // Return cached data if valid
      if (this.cache && this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheDuration) {
        console.log('✅ Serving cached revenue data');
        return {
          ...this.cache,
          cached: true,
          cacheAge: Math.floor((now - this.cacheTimestamp) / 1000)
        };
      }
      
      // Fetch fresh data if cache expired or doesn't exist
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const freshData = await revenueService.getRevenueAndOccupancy();
          this.cache = freshData;
          this.cacheTimestamp = Date.now();
          
          return {
            ...freshData,
            cached: false,
            cacheAge: 0
          };
        } finally {
          this.isRefreshing = false;
        }
      } else {
        // If already refreshing, return stale cache or null
        console.log('⏳ Refresh in progress, returning stale cache');
        if (this.cache) {
          return {
            ...this.cache,
            cached: true,
            stale: true,
            cacheAge: Math.floor((now - this.cacheTimestamp) / 1000)
          };
        }
      }
    } catch (error) {
      console.error('❌ Error in getRevenueData:', error.message);
      
      // Return cached data even if expired during error
      if (this.cache) {
        return {
          ...this.cache,
          cached: true,
          error: 'Error fetching fresh data, serving stale cache',
          cacheAge: Math.floor((Date.now() - this.cacheTimestamp) / 1000)
        };
      }
      
      // Return error response if no cache available
      return {
        success: false,
        error: error.message,
        cached: false,
        actualRevenue: 0,
        expectedRevenue: 0,
        occupancyRate: 0
      };
    }
  }

  /**
   * Manually refresh cache
   * @returns {Promise<Object>} Fresh revenue data
   */
  async refreshCache() {
    try {
      console.log('🔄 Manually refreshing revenue cache...');
      
      const freshData = await revenueService.getRevenueAndOccupancy();
      this.cache = freshData;
      this.cacheTimestamp = Date.now();
      
      console.log('✅ Cache refreshed successfully');
      
      return {
        ...freshData,
        cached: false,
        refreshed: true,
        refreshTime: new Date(this.cacheTimestamp).toISOString()
      };
    } catch (error) {
      console.error('❌ Error refreshing cache:', error.message);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
    console.log('🗑️ Revenue cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    const now = Date.now();
    const isValid = this.cache && this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheDuration;
    
    return {
      hasCache: !!this.cache,
      isValid,
      age: this.cacheTimestamp ? Math.floor((now - this.cacheTimestamp) / 1000) : null,
      duration: Math.floor(this.cacheDuration / 1000),
      timestamp: this.cacheTimestamp ? new Date(this.cacheTimestamp).toISOString() : null,
      isRefreshing: this.isRefreshing
    };
  }

  /**
   * Set custom cache duration
   * @param {number} milliseconds - Cache duration in milliseconds
   */
  setCacheDuration(milliseconds) {
    this.cacheDuration = milliseconds;
    console.log(`⏱️ Cache duration set to ${Math.floor(milliseconds / 1000)} seconds`);
  }

  /**
   * Warm cache by fetching data
   * @returns {Promise<Object>} Warming result
   */
  async warmCache() {
    try {
      console.log('🔥 Warming cache...');
      return await this.refreshCache();
    } catch (error) {
      console.error('❌ Error warming cache:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const instance = new CachedRevenueService();

// Export instance
module.exports = instance;
