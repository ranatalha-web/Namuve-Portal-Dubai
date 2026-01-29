const axios = require('axios');

/**
 * Teable Service
 * Handles all interactions with Teable API for posting and managing records
 */

class TeableService {
  constructor() {
    this.baseUrl = 'https://teable.namuve.com/api/table/tblbswOqGUpJMx5fy2v/record';
    this.baseTableUrl = 'https://teable.namuve.com/api/table/tblbswOqGUpJMx5fy2v';
    this.authToken = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN;
    
    // Cooldown tracking (1 hour between posts)
    this.lastPostedTime = null;
    this.cooldownMinutes = 60;
    
    if (!this.authToken) {
      console.warn('⚠️ TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN not found in environment variables');
    }
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Get Pakistan date and time
   */
  getPakistanDateTime() {
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    
    return {
      date: pakistanTime.toISOString().split('T')[0],
      dateTime: pakistanTime.toISOString(),
      hours: pakistanTime.getUTCHours(),
      minutes: pakistanTime.getUTCMinutes()
    };
  }

  /**
   * Check if posting is allowed now (respects cooldown)
   */
  canPostNow() {
    if (!this.lastPostedTime) {
      return true;
    }
    
    const now = Date.now();
    const lastPosted = this.lastPostedTime.getTime();
    const cooldownMs = this.cooldownMinutes * 60 * 1000;
    
    return (now - lastPosted) >= cooldownMs;
  }

  /**
   * Get time remaining until next post is allowed (in minutes)
   */
  getTimeUntilNextPost() {
    if (!this.lastPostedTime) {
      return 0;
    }
    
    const now = Date.now();
    const lastPosted = this.lastPostedTime.getTime();
    const cooldownMs = this.cooldownMinutes * 60 * 1000;
    const remaining = cooldownMs - (now - lastPosted);
    
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  }

  /**
   * Reset posting cooldown (for testing)
   */
  resetCooldown() {
    this.lastPostedTime = null;
    console.log('🔄 Posting cooldown reset');
  }

  /**
   * Post target data (actual + achieved) to Teable
   */
  async postTargetData(data) {
    try {
      if (!this.canPostNow()) {
        const remaining = this.getTimeUntilNextPost();
        return {
          success: false,
          error: `Cooldown in effect. Next post allowed in ${remaining} minutes.`,
          canPost: false,
          remainingMinutes: remaining
        };
      }

      console.log('📊 Posting target data to Teable...');
      
      const payload = {
        records: [{
          fields: {
            "Actual Revenue": String(data.actual || 0),
            "Expected Revenue ": String(data.achieved || 0)
          }
        }]
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: this.getHeaders()
      });

      this.lastPostedTime = new Date();

      console.log('✅ Data posted successfully:', response.data.records[0].id);
      return {
        success: true,
        recordId: response.data.records[0].id,
        data: response.data.records[0],
        postedAt: this.lastPostedTime.toISOString()
      };

    } catch (error) {
      console.error('❌ Error posting target data:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get all records from Teable
   */
  async getAllRecords() {
    try {
      console.log('📊 Fetching all records from Teable...');
      
      const pageSize = 100;
      let allRecords = [];
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.get(this.baseUrl, {
          headers: this.getHeaders(),
          params: {
            take: pageSize,
            skip: skip
          }
        });

        const records = response.data.records || [];
        
        if (records.length === 0) {
          hasMore = false;
        } else {
          allRecords.push(...records);
          skip += pageSize;
          
          if (records.length < pageSize) {
            hasMore = false;
          }
        }
      }

      console.log(`✅ Fetched ${allRecords.length} records`);
      return {
        success: true,
        data: allRecords,
        total: allRecords.length
      };

    } catch (error) {
      console.error('❌ Error fetching records:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: []
      };
    }
  }

  /**
   * Delete a specific record from Teable
   */
  async deleteRecord(recordId) {
    try {
      console.log('🗑️ Deleting record:', recordId);
      
      const response = await axios.delete(`${this.baseUrl}/${recordId}`, {
        headers: this.getHeaders()
      });

      console.log('✅ Record deleted successfully');
      return {
        success: true,
        message: 'Record deleted successfully'
      };

    } catch (error) {
      console.error('❌ Error deleting record:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Update a record in Teable
   */
  async updateRecord(recordId, data) {
    try {
      console.log('📝 Updating record:', recordId);
      
      const payload = {
        fields: data
      };

      const response = await axios.patch(`${this.baseUrl}/${recordId}`, payload, {
        headers: this.getHeaders()
      });

      console.log('✅ Record updated successfully');
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error updating record:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Create a new record in Teable
   */
  async createRecord(data) {
    try {
      console.log('✏️ Creating new record in Teable...');
      
      const payload = {
        records: [{
          fields: data
        }]
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: this.getHeaders()
      });

      this.lastPostedTime = new Date();

      console.log('✅ Record created successfully:', response.data.records[0].id);
      return {
        success: true,
        recordId: response.data.records[0].id,
        data: response.data.records[0],
        postedAt: this.lastPostedTime.toISOString()
      };

    } catch (error) {
      console.error('❌ Error creating record:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Test connection to Teable
   */
  async testConnection() {
    try {
      console.log('🔗 Testing connection to Teable...');
      
      const response = await axios.get(`${this.baseTableUrl}/records`, {
        headers: this.getHeaders(),
        timeout: 5000,
        params: {
          take: 1
        }
      });

      console.log('✅ Connection successful');
      return {
        success: true,
        message: 'Connection to Teable successful',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = TeableService;
