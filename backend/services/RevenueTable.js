const axios = require('axios');
const express = require('express');

console.log('🚨🚨🚨 REVENUE TABLE SERVICE LOADED - NEW VERSION 🚨🚨🚨');

class RevenueTableService {
  constructor() {
    // Main revenue table URL
    this.baseUrl = 'https://teable.namuve.com/api/table/tblbswOqGUpJMx5fy2v/record';
    this.baseTableUrl = 'https://teable.namuve.com/api/table/tblbswOqGUpJMx5fy2v';
    // Listing revenue table URL - try different endpoint patterns
    this.listingRevenueUrl = 'https://teable.namuve.com/api/table/tblWSUEAGe7IirM9ODd/record';
    this.listingTableUrl = 'https://teable.namuve.com/api/table/tblWSUEAGe7IirM9ODd';
    this.listingRecordsUrl = 'https://teable.namuve.com/api/table/tblWSUEAGe7IirM9ODd/records';
    this.authToken = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN;
    
    if (!this.authToken) {
      console.warn('⚠️ TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN not found in environment variables');
    }
  }

  // Get headers for API requests
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Create new revenue record
  async createRevenueRecord(revenueData) {
    try {
      console.log('📊 Creating revenue record in Teable...');
      
      const payload = {
        records: [{
          fields: {
            "Actual Revenue": String(revenueData.actualRevenue || 0),
            "Expected Revenue ": String(revenueData.expectedRevenue || 0),
            "MONTHLY TARGET Achieved": String(revenueData.monthlyTargetAchieved || 0),
            "QUARTERLY TARGET Achieved": String(revenueData.quarterlyTargetAchieved || 0),
            "DAILY TARGET Achieved": String(revenueData.dailyTargetAchieved || 0)
          }
        }]
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: this.getHeaders()
      });

      console.log('✅ Revenue record created successfully:', response.data.records[0].id);
      return {
        success: true,
        recordId: response.data.records[0].id,
        data: response.data.records[0]
      };

    } catch (error) {
      console.error('❌ Error creating revenue record:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Update existing revenue record
  async updateRevenueRecord(recordId, revenueData) {
    try {
      console.log('📊 Updating revenue record in Teable:', recordId);
      
      const payload = {
        fields: {
          "Actual Revenue": String(revenueData.actualRevenue || 0),
          "Expected Revenue ": String(revenueData.expectedRevenue || 0),
          "MONTHLY TARGET Achieved": String(revenueData.monthlyTargetAchieved || 0),
          "QUARTERLY TARGET Achieved": String(revenueData.quarterlyTargetAchieved || 0),
          "DAILY TARGET Achieved": String(revenueData.dailyTargetAchieved || 0)
        }
      };

      const response = await axios.patch(`${this.baseUrl}/${recordId}`, payload, {
        headers: this.getHeaders()
      });

      console.log('✅ Revenue record updated successfully');
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error updating revenue record:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get all revenue records with proper pagination
  async getAllRevenueRecords(maxRecords = null) {
    try {
      console.log('📊 Fetching ALL revenue records from Teable with dynamic pagination...');
      
      const pageSize = 100;
      let allRecords = [];
      let currentPage = 0;
      let hasMoreRecords = true;
      
      while (hasMoreRecords) {
        const skip = currentPage * pageSize;
        const take = maxRecords ? Math.min(pageSize, maxRecords - allRecords.length) : pageSize;
        
        console.log(`📄 Fetching page ${currentPage + 1}: skip=${skip}, take=${take}`);
        
        const response = await axios.get(this.baseUrl, {
          headers: this.getHeaders(),
          params: {
            take: take,
            skip: skip
          }
        });
        
        const pageRecords = response.data.records || [];
        allRecords.push(...pageRecords);
        
        console.log(`   ✅ Page ${currentPage + 1}: Got ${pageRecords.length} records`);
        
        // Check if we should continue pagination
        if (pageRecords.length < take) {
          hasMoreRecords = false;
          console.log('   🏁 Last page reached (got fewer records than requested)');
        } else if (maxRecords && allRecords.length >= maxRecords) {
          hasMoreRecords = false;
          console.log('   🏁 Max records limit reached');
        }
        
        currentPage++;
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          console.warn('⚠️ Safety limit reached (100 pages), stopping pagination');
          hasMoreRecords = false;
        }
        
        // Small delay to avoid API rate limiting
        if (hasMoreRecords) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Sort records by creation time (newest first)
      allRecords.sort((a, b) => {
        const timeA = new Date(a.createdTime || 0);
        const timeB = new Date(b.createdTime || 0);
        return timeB - timeA;
      });
      
      console.log(`✅ Dynamic pagination complete: ${allRecords.length} total records from ${currentPage} pages`);
      return {
        success: true,
        records: allRecords,
        total: allRecords.length,
        pages: currentPage
      };

    } catch (error) {
      console.error('❌ Error fetching revenue records:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        records: []
      };
    }
  }

  // Get today's revenue record
  async getTodayRevenueRecord() {
    try {
      console.log('📊 Fetching today\'s revenue record...');
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get all records and filter for today
      const allRecords = await this.getAllRevenueRecords();
      
      if (!allRecords.success) {
        return allRecords;
      }

      const todayRecord = allRecords.records.find(record => {
        const recordDate = record.fields?.Date;
        return recordDate === today;
      });

      if (todayRecord) {
        console.log('✅ Today\'s revenue record found:', todayRecord.id);
        return {
          success: true,
          record: todayRecord,
          exists: true
        };
      } else {
        console.log('ℹ️ No revenue record found for today');
        return {
          success: true,
          record: null,
          exists: false
        };
      }

    } catch (error) {
      console.error('❌ Error fetching today\'s revenue record:', error.message);
      return {
        success: false,
        error: error.message,
        record: null
      };
    }
  }

  // Create or update today's revenue record
  async createOrUpdateTodayRevenue(revenueData) {
    try {
      console.log('📊 Creating or updating today\'s revenue record...');
      
      // Check if today's record exists
      const todayRecord = await this.getTodayRevenueRecord();
      
      if (!todayRecord.success) {
        return todayRecord;
      }

      if (todayRecord.exists && todayRecord.record) {
        // Update existing record
        console.log('📝 Updating existing today\'s record...');
        return await this.updateRevenueRecord(todayRecord.record.id, revenueData);
      } else {
        // Create new record
        console.log('📝 Creating new today\'s record...');
        return await this.createRevenueRecord(revenueData);
      }

    } catch (error) {
      console.error('❌ Error in createOrUpdateTodayRevenue:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get latest revenue record
  async getLatestRevenueRecord() {
    try {
      console.log('📊 Fetching latest revenue record...');
      
      const allRecords = await this.getAllRevenueRecords();
      
      if (!allRecords.success || allRecords.records.length === 0) {
        return {
          success: true,
          record: null,
          message: 'No revenue records found'
        };
      }

      // Sort by timestamp and get the latest
      const sortedRecords = allRecords.records.sort((a, b) => {
        const timestampA = new Date(a.fields?.Timestamp || a.createdTime);
        const timestampB = new Date(b.fields?.Timestamp || b.createdTime);
        return timestampB - timestampA;
      });

      const latestRecord = sortedRecords[0];
      
      console.log('✅ Latest revenue record found:', latestRecord.id);
      return {
        success: true,
        record: latestRecord
      };

    } catch (error) {
      console.error('❌ Error fetching latest revenue record:', error.message);
      return {
        success: false,
        error: error.message,
        record: null
      };
    }
  }

  // Delete revenue record
  async deleteRevenueRecord(recordId) {
    try {
      console.log('🗑️ Deleting revenue record:', recordId);
      
      const response = await axios.delete(`${this.baseUrl}/${recordId}`, {
        headers: this.getHeaders()
      });

      console.log('✅ Revenue record deleted successfully');
      return {
        success: true,
        message: 'Record deleted successfully'
      };

    } catch (error) {
      console.error('❌ Error deleting revenue record:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Format revenue data for display
  formatRevenueData(record) {
    if (!record || !record.fields) {
      return null;
    }

    const fields = record.fields;
    
    // Helper to parse numeric values (handles strings and numbers)
    const parseValue = (val) => {
      if (val === null || val === undefined || val === '') return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    // Try to read from the new field names first (what we're storing now)
    // Fall back to old field names for backward compatibility
    return {
      id: record.id,
      actualRevenue: parseValue(fields["Actual Revenue"] || fields["Daily Actual Revenue"]),
      expectedRevenue: parseValue(fields["Expected Revenue "]),
      monthlyTargetAchieved: parseValue(fields["MONTHLY TARGET Achieved"] || fields["MONTHLY Actual Revenue"]),
      quarterlyTargetAchieved: parseValue(fields["QUARTERLY TARGET Achieved"] || fields["QUARTERLY Achieved Revenue"]),
      dailyTargetAchieved: parseValue(fields["DAILY TARGET Achieved"] || fields["Daily Actual Revenue"]),
      createdTime: record.createdTime,
      lastModifiedTime: record.lastModifiedTime
    };
  }

  // Batch create multiple revenue records
  async batchCreateRevenueRecords(revenueDataArray) {
    try {
      console.log('📊 Batch creating revenue records:', revenueDataArray.length);
      
      const results = [];
      
      for (const revenueData of revenueDataArray) {
        const result = await this.createRevenueRecord(revenueData);
        results.push(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`✅ Batch operation completed: ${successCount} success, ${failureCount} failures`);
      
      return {
        success: true,
        results: results,
        summary: {
          total: revenueDataArray.length,
          success: successCount,
          failures: failureCount
        }
      };

    } catch (error) {
      console.error('❌ Error in batch create:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== LISTING REVENUE METHODS ====================
  
  // Create new listing revenue record
  async createListingRevenueRecord(listingData) {
    try {
      console.log('🚨 NEW FIXED VERSION - Creating listing revenue record in Teable...');
      console.log('📋 Raw data received:', JSON.stringify(listingData, null, 2));
      
      // Transform the data to match Teable field names
      const teableFields = {
        "Studio": String(listingData.studio || 0),
        "1BR": String(listingData.oneBR || 0),
        "2BR": String(listingData.twoBR || 0),
        "2BR Premium": String(listingData.twoBRPremium || 0),
        "3BR": String(listingData.threeBR || 0)
      };
      
      // Try different payload formats and endpoints based on the error message
      const testOptions = [
        {
          name: "records array with /records endpoint",
          url: 'https://teable.namuve.com/api/table/tblWSUEAGe7IirM9ODd/records',
          payload: {
            records: [{
              fields: teableFields
            }]
          }
        },
        {
          name: "single record with /record endpoint",
          url: 'https://teable.namuve.com/api/table/tblWSUEAGe7IirM9ODd/record',
          payload: {
            record: {
              fields: teableFields
            }
          }
        },
        {
          name: "records array with /record endpoint",
          url: 'https://teable.namuve.com/api/table/tblWSUEAGe7IirM9ODd/record',
          payload: {
            records: [{
              fields: teableFields
            }]
          }
        }
      ];
      
      // Try each option until one works
      for (const { name, url, payload } of testOptions) {
        try {
          console.log(`📋 Trying: ${name}`);
          console.log('📋 URL:', url);
          console.log('📋 Payload:', JSON.stringify(payload, null, 2));
          
          const response = await axios.post(url, payload, {
            headers: this.getHeaders()
          });
          
          console.log(`✅ SUCCESS with: ${name}`);
          console.log('📋 Response:', JSON.stringify(response.data, null, 2));
          
          const recordId = response.data.records ? response.data.records[0].id : response.data.id;
          const recordData = response.data.records ? response.data.records[0] : response.data;
          
          return {
            success: true,
            recordId: recordId,
            data: recordData,
            method: name
          };
          
        } catch (optionError) {
          console.log(`❌ ${name} failed:`, optionError.response?.data?.message || optionError.message);
          continue;
        }
      }
      
      // If all options fail
      throw new Error('All payload and endpoint combinations failed');

    } catch (error) {
      console.error('❌ Error creating listing revenue record:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Update existing listing revenue record
  async updateListingRevenueRecord(recordId, listingData) {
    try {
      console.log('🏠 Updating listing revenue record in Teable:', recordId);
      
      // Try different payload formats for updating
      const payloadOptions = [
        // Option 1: Direct fields (current approach)
        {
          name: "direct fields",
          payload: {
            fields: {
              "Studio": String(listingData.studio || 0),
              "1BR": String(listingData.oneBR || 0),
              "2BR": String(listingData.twoBR || 0),
              "2BR Premium": String(listingData.twoBRPremium || 0),
              "3BR": String(listingData.threeBR || 0)
            }
          }
        },
        // Option 2: Wrapped in record (what the error suggests)
        {
          name: "wrapped in record",
          payload: {
            record: {
              fields: {
                "Studio": String(listingData.studio || 0),
                "1BR": String(listingData.oneBR || 0),
                "2BR": String(listingData.twoBR || 0),
                "2BR Premium": String(listingData.twoBRPremium || 0),
                "3BR": String(listingData.threeBR || 0)
              }
            }
          }
        }
      ];
      
      // Try each payload format
      for (const { name, payload } of payloadOptions) {
        try {
          console.log(`📋 Trying update with: ${name}`);
          console.log('📋 Update payload:', JSON.stringify(payload, null, 2));

          const response = await axios.patch(`${this.listingRevenueUrl}/${recordId}`, payload, {
            headers: this.getHeaders()
          });

          console.log(`✅ Listing revenue record updated successfully with: ${name}`);
          return {
            success: true,
            data: response.data,
            method: name
          };
          
        } catch (optionError) {
          console.log(`❌ Update with ${name} failed:`, optionError.response?.data?.message || optionError.message);
          continue;
        }
      }
      
      // If all options fail
      throw new Error('All update payload formats failed');

    } catch (error) {
      console.error('❌ Error updating listing revenue record:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get all listing revenue records with proper pagination
  async getAllListingRevenueRecords(maxRecords = null) {
    try {
      console.log('🏠 Fetching ALL listing revenue records from Teable with dynamic pagination...');
      
      const pageSize = 100;
      let allRecords = [];
      let currentPage = 0;
      let hasMoreRecords = true;
      
      while (hasMoreRecords) {
        const skip = currentPage * pageSize;
        const take = maxRecords ? Math.min(pageSize, maxRecords - allRecords.length) : pageSize;
        
        console.log(`📄 Fetching listing page ${currentPage + 1}: skip=${skip}, take=${take}`);
        
        const response = await axios.get(this.listingRevenueUrl, {
          headers: this.getHeaders(),
          params: {
            take: take,
            skip: skip
          }
        });
        
        const pageRecords = response.data.records || [];
        allRecords.push(...pageRecords);
        
        console.log(`   ✅ Listing page ${currentPage + 1}: Got ${pageRecords.length} records`);
        
        // Check if we should continue pagination
        if (pageRecords.length < take) {
          hasMoreRecords = false;
          console.log('   🏁 Last listing page reached (got fewer records than requested)');
        } else if (maxRecords && allRecords.length >= maxRecords) {
          hasMoreRecords = false;
          console.log('   🏁 Max listing records limit reached');
        }
        
        currentPage++;
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          console.warn('⚠️ Safety limit reached (100 listing pages), stopping pagination');
          hasMoreRecords = false;
        }
        
        // Small delay to avoid API rate limiting
        if (hasMoreRecords) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Sort records by creation time (newest first)
      allRecords.sort((a, b) => {
        const timeA = new Date(a.createdTime || 0);
        const timeB = new Date(b.createdTime || 0);
        return timeB - timeA;
      });
      
      console.log(`✅ Dynamic listing pagination complete: ${allRecords.length} total records from ${currentPage} pages`);
      return {
        success: true,
        records: allRecords,
        total: allRecords.length,
        pages: currentPage
      };

    } catch (error) {
      console.error('❌ Error fetching listing revenue records:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        records: []
      };
    }
  }

  // Get today's listing revenue record
  async getTodayListingRevenueRecord() {
    try {
      console.log('🏠 Fetching today\'s listing revenue record...');
      
      // Get all records and find the latest one (since no date field)
      const allRecords = await this.getAllListingRevenueRecords();
      
      if (!allRecords.success) {
        return allRecords;
      }

      if (allRecords.records.length > 0) {
        // Sort by creation time and get the latest
        const sortedRecords = allRecords.records.sort((a, b) => {
          return new Date(b.createdTime) - new Date(a.createdTime);
        });
        
        const latestRecord = sortedRecords[0];
        
        console.log('✅ Latest listing revenue record found:', latestRecord.id);
        return {
          success: true,
          record: latestRecord,
          exists: true
        };
      } else {
        console.log('ℹ️ No listing revenue records found');
        return {
          success: true,
          record: null,
          exists: false
        };
      }

    } catch (error) {
      console.error('❌ Error fetching today\'s listing revenue record:', error.message);
      return {
        success: false,
        error: error.message,
        record: null
      };
    }
  }

  // Create or update today's listing revenue record
  async createOrUpdateTodayListingRevenue(listingData) {
    try {
      console.log('🚨🚨🚨 ACTUAL TEABLE API CALL HAPPENING HERE 🚨🚨🚨');
      console.log('🏠 Creating or updating today\'s listing revenue record...');
      console.log('🔍 Auth token:', this.authToken ? this.authToken.substring(0, 20) + '...' : 'MISSING');
      console.log('🔍 URL:', this.listingRevenueUrl);
      console.log('🔍 Data being sent:', JSON.stringify(listingData, null, 2));
      
      // Check if today's record exists
      const todayRecord = await this.getTodayListingRevenueRecord();
      
      if (!todayRecord.success) {
        return todayRecord;
      }

      if (todayRecord.exists && todayRecord.record) {
        // Update existing record
        console.log('📝 Updating existing today\'s listing record...');
        return await this.updateListingRevenueRecord(todayRecord.record.id, listingData);
      } else {
        // Create new record
        console.log('📝 Creating new today\'s listing record...');
        return await this.createListingRevenueRecord(listingData);
      }

    } catch (error) {
      console.error('❌ Error in createOrUpdateTodayListingRevenue:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Format listing revenue data for display
  formatListingRevenueData(record) {
    if (!record || !record.fields) {
      return null;
    }

    const fields = record.fields;
    
    return {
      id: record.id,
      studio: fields["Studio"] || "0",
      oneBR: fields["1BR"] || "0",
      twoBR: fields["2BR"] || "0",
      twoBRPremium: fields["2BR Premium"] || "0",
      threeBR: fields["3BR"] || "0",
      createdTime: record.createdTime,
      lastModifiedTime: record.lastModifiedTime
    };
  }

  // Test connection to Teable
  async testConnection() {
    try {
      console.log('🔍 Testing Teable connection...');
      
      // Test with small page to verify connection
      const response = await axios.get(this.baseUrl, {
        headers: this.getHeaders(),
        params: {
          take: 10,
          skip: 0
        }
      });

      console.log('✅ Teable connection successful');
      return {
        success: true,
        message: 'Connection successful',
        recordCount: response.data.records?.length || 0
      };

    } catch (error) {
      console.error('❌ Teable connection failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Test pagination functionality
  async testPagination() {
    try {
      console.log('🧪 TESTING PAGINATION FUNCTIONALITY...');
      
      // Test first page only
      console.log('📄 Testing first page (take=100, skip=0)...');
      const firstPageResponse = await axios.get(this.baseUrl, {
        headers: this.getHeaders(),
        params: {
          take: 100,
          skip: 0
        }
      });
      
      const firstPageCount = firstPageResponse.data.records?.length || 0;
      console.log(`📄 First page: ${firstPageCount} records`);
      
      // Test second page
      console.log('📄 Testing second page (take=100, skip=100)...');
      const secondPageResponse = await axios.get(this.baseUrl, {
        headers: this.getHeaders(),
        params: {
          take: 100,
          skip: 100
        }
      });
      
      const secondPageCount = secondPageResponse.data.records?.length || 0;
      console.log(`📄 Second page: ${secondPageCount} records`);
      
      // Test full pagination with limit
      console.log('📊 Testing full pagination (first 200 records)...');
      const allRecords = await this.getAllRevenueRecords(200);
      console.log(`📊 TOTAL RECORDS WITH PAGINATION: ${allRecords.total} from ${allRecords.pages} pages`);
      
      return {
        success: true,
        firstPageCount,
        secondPageCount,
        totalRecords: allRecords.total,
        totalPages: allRecords.pages,
        message: `Pagination test complete. Total: ${allRecords.total} records from ${allRecords.pages} pages`
      };

    } catch (error) {
      console.error('❌ Pagination test failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  // Integration with existing revenue calculation system
  async integrateWithExistingRevenue() {
    try {
      console.log('🔄 Starting revenue calculation and database integration...');
      
      // This method should be called after your existing revenue calculations complete
      // You'll need to pass the calculated values here
      
      // Example integration - replace with your actual revenue calculation results
      const calculatedRevenue = await this.getCalculatedRevenueFromExistingSystem();
      
      // Store in database
      const result = await this.createOrUpdateTodayRevenue(calculatedRevenue);
      
      if (result.success) {
        console.log('✅ Revenue data successfully stored in database');
        return { success: true, message: 'Revenue data updated in database' };
      } else {
        console.error('❌ Failed to store revenue data:', result.error);
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      console.error('❌ Error in revenue integration:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Method to get calculated revenue from your existing system
  async getCalculatedRevenueFromExistingSystem() {
    try {
      console.log('🔄 Fetching revenue data from existing system...');
      
      // Import your existing revenue service
      const { getRevenueAndOccupancy } = require('../src/services/revenueService');
      
      // Get calculated revenue data from your existing system
      const revenueData = await getRevenueAndOccupancy();
      
      console.log('📊 Revenue data received from existing system:', {
        actualRevenue: revenueData.actualRevenue,
        expectedRevenue: revenueData.expectedRevenue,
        monthlyAchieved: revenueData.monthlyAchievedRevenue,
        quarterlyAchieved: revenueData.quarterlyAchievedRevenue
      });
      
      // Convert to numbers and format for database
      const actualRevenue = parseFloat(revenueData.actualRevenue) || 0;
      const expectedRevenue = parseFloat(revenueData.expectedRevenue) || 0;
      const monthlyAchieved = parseFloat(revenueData.monthlyAchievedRevenue) || 0;
      const quarterlyAchieved = parseFloat(revenueData.quarterlyAchievedRevenue) || 0;
      
      // Calculate daily target achieved (you can adjust this logic)
      const dailyTargetAchieved = actualRevenue; // Using actual revenue as daily achieved
      
      return {
        actualRevenue: actualRevenue,
        expectedRevenue: expectedRevenue,
        dailyTargetAchieved: dailyTargetAchieved,
        monthlyTargetAchieved: monthlyAchieved,
        quarterlyTargetAchieved: quarterlyAchieved
      };
      
    } catch (error) {
      console.error('❌ Error getting revenue from existing system:', error.message);
      
      // Return zeros on error to prevent database issues
      return {
        actualRevenue: 0,
        expectedRevenue: 0,
        dailyTargetAchieved: 0,
        monthlyTargetAchieved: 0,
        quarterlyTargetAchieved: 0
      };
    }
  }

  // Method to get calculated listing revenue from your existing system
  async getCalculatedListingRevenueFromExistingSystem() {
    try {
      console.log('🏠 Fetching listing revenue data from existing system...');
      
      // Import your existing revenue service
      const { getRevenueAndOccupancy } = require('../src/services/revenueService');
      
      // Get calculated revenue data from your existing system
      const revenueData = await getRevenueAndOccupancy();
      
      console.log('🏠 Listing revenue data received from existing system:', {
        categoryRevenue: revenueData.categoryRevenue
      });
      
      // Extract category revenue data and convert to numbers
      const categoryRevenue = revenueData.categoryRevenue || {};
      
      return {
        studio: parseFloat(categoryRevenue.Studio) || 0,
        oneBR: parseFloat(categoryRevenue['1BR']) || 0,
        twoBR: parseFloat(categoryRevenue['2BR']) || 0,
        twoBRPremium: parseFloat(categoryRevenue['2BR Premium']) || 0,
        threeBR: parseFloat(categoryRevenue['3BR']) || 0
      };
      
    } catch (error) {
      console.error('❌ Error getting listing revenue from existing system:', error.message);
      
      // Return zeros on error to prevent database issues
      return {
        studio: 0,
        oneBR: 0,
        twoBR: 0,
        twoBRPremium: 0,
        threeBR: 0
      };
    }
  }

  // Integration with existing listing revenue calculation system
  async integrateListingRevenueWithExistingSystem() {
    try {
      console.log('🏠 Starting listing revenue calculation and database integration...');
      
      // Get calculated listing revenue data from existing system
      const calculatedListingRevenue = await this.getCalculatedListingRevenueFromExistingSystem();
      
      // Store in database
      const result = await this.createOrUpdateTodayListingRevenue(calculatedListingRevenue);
      
      if (result.success) {
        console.log('✅ Listing revenue data successfully stored in database');
        return { success: true, message: 'Listing revenue data updated in database' };
      } else {
        console.error('❌ Failed to store listing revenue data:', result.error);
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      console.error('❌ Error in listing revenue integration:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Start automatic revenue updates (call this when backend starts)
  startAutomaticUpdates(intervalMinutes = 20) {
    console.log(`🔄 Starting automatic revenue updates every ${intervalMinutes} minutes...`);
    
    // Run immediately on start
    this.integrateWithExistingRevenue();
    this.integrateListingRevenueWithExistingSystem();
    
    // Then run every specified interval
    setInterval(async () => {
      console.log('⏰ Running scheduled revenue update...');
      await this.integrateWithExistingRevenue();
      await this.integrateListingRevenueWithExistingSystem();
    }, intervalMinutes * 60 * 1000);
  }

  // API Routes for frontend integration
  static createAPIRoutes() {
    console.log('🚀 Creating RevenueTable API routes...');
    const router = express.Router();
    const revenueService = new RevenueTableService();
    console.log('✅ RevenueTable service instance created');

    // ULTRA FAST endpoint - Get all revenue data for frontend in one call (< 2 seconds)
    router.get('/fast-dashboard-data', async (req, res) => {
      try {
        console.log('⚡ ULTRA FAST: Frontend requesting all dashboard data...');
        const startTime = Date.now();
        
        // Get limit from query parameter (default: no limit)
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        console.log(`⚡ Limit requested: ${limit || 'unlimited'} records`);
        
        // Get all data in parallel for maximum speed
        const [revenueResult, listingResult] = await Promise.all([
          limit ? revenueService.getAllRevenueRecords(limit) : revenueService.getLatestRevenueRecord(),
          limit ? revenueService.getAllListingRevenueRecords(limit) : revenueService.getTodayListingRevenueRecord()
        ]);
        
        const responseData = {
          success: true,
          timestamp: new Date().toISOString(),
          loadTime: `${Date.now() - startTime}ms`,
          data: {
            revenue: null,
            listingRevenue: null,
            summary: {
              actualRevenue: '0',
              expectedRevenue: '0',
              monthlyAchieved: '0',
              quarterlyAchieved: '0',
              dailyAchieved: '0'
            }
          }
        };
        
        // Format revenue data if available
        if (limit) {
          // Handle limited records response
          if (revenueResult.success && revenueResult.records && revenueResult.records.length > 0) {
            const latestRecord = revenueResult.records[0]; // First record (newest)
            responseData.data.revenue = revenueService.formatRevenueData(latestRecord);
            responseData.data.summary = {
              actualRevenue: responseData.data.revenue.actualRevenue || '0',
              expectedRevenue: responseData.data.revenue.expectedRevenue || '0',
              monthlyAchieved: responseData.data.revenue.monthlyTargetAchieved || '0',
              quarterlyAchieved: responseData.data.revenue.quarterlyTargetAchieved || '0',
              dailyAchieved: responseData.data.revenue.dailyTargetAchieved || '0'
            };
            responseData.data.revenueTotal = revenueResult.total;
            responseData.data.revenueLimit = limit;
          }
          
          if (listingResult.success && listingResult.records && listingResult.records.length > 0) {
            const latestRecord = listingResult.records[0]; // First record (newest)
            responseData.data.listingRevenue = revenueService.formatListingRevenueData(latestRecord);
            responseData.data.listingTotal = listingResult.total;
            responseData.data.listingLimit = limit;
          }
        } else {
          // Handle single record response (original behavior)
          if (revenueResult.success && revenueResult.record) {
            responseData.data.revenue = revenueService.formatRevenueData(revenueResult.record);
            responseData.data.summary = {
              actualRevenue: responseData.data.revenue.actualRevenue || '0',
              expectedRevenue: responseData.data.revenue.expectedRevenue || '0',
              monthlyAchieved: responseData.data.revenue.monthlyTargetAchieved || '0',
              quarterlyAchieved: responseData.data.revenue.quarterlyTargetAchieved || '0',
              dailyAchieved: responseData.data.revenue.dailyTargetAchieved || '0'
            };
          }
          
          if (listingResult.success && listingResult.record) {
            responseData.data.listingRevenue = revenueService.formatListingRevenueData(listingResult.record);
          }
        }
        
        console.log(`⚡ ULTRA FAST: Dashboard data loaded in ${responseData.loadTime}`);
        res.json(responseData);
        
      } catch (error) {
        console.error('❌ Error in ultra fast dashboard endpoint:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to load dashboard data',
          loadTime: '0ms'
        });
      }
    });

    // Get latest revenue data for frontend (fast endpoint - 2 seconds)
    router.get('/revenue-data', async (req, res) => {
      try {
        console.log('📊 Frontend requesting revenue data...');
        
        // Get limit from query parameter (default: no limit)
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        console.log(`📊 Limit requested: ${limit || 'unlimited'} records`);
        
        if (limit && limit > 0) {
          // Get limited records using pagination
          const allRecords = await revenueService.getAllRevenueRecords(limit);
          
          if (allRecords.success && allRecords.records.length > 0) {
            const latestRecord = allRecords.records[0]; // First record (newest)
            const formattedData = revenueService.formatRevenueData(latestRecord);
            
            res.json({
              success: true,
              data: formattedData,
              total: allRecords.total,
              limit: limit,
              message: `Revenue data loaded successfully (${allRecords.total} records, limit: ${limit})`
            });
          } else {
            res.json({
              success: false,
              data: null,
              message: 'No revenue data available'
            });
          }
        } else {
          // Get latest record only (original behavior)
          const latestRecord = await revenueService.getLatestRevenueRecord();
          
          if (latestRecord.success && latestRecord.record) {
            const formattedData = revenueService.formatRevenueData(latestRecord.record);
            
            res.json({
              success: true,
              data: formattedData,
              message: 'Revenue data loaded successfully'
            });
          } else {
            res.json({
              success: false,
              data: null,
              message: 'No revenue data available'
            });
          }
        }
        
      } catch (error) {
        console.error('❌ Error serving revenue data to frontend:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to load revenue data'
        });
      }
    });

    // Get latest listing revenue data for frontend (fast endpoint - 2 seconds)
    router.get('/listing-revenue-data', async (req, res) => {
      try {
        console.log('🏠 Frontend requesting listing revenue data...');
        
        // Get limit from query parameter (default: no limit)
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        console.log(`🏠 Limit requested: ${limit || 'unlimited'} records`);
        
        if (limit && limit > 0) {
          // Get limited records using pagination
          const allRecords = await revenueService.getAllListingRevenueRecords(limit);
          
          if (allRecords.success && allRecords.records.length > 0) {
            const latestRecord = allRecords.records[0]; // First record (newest)
            const formattedData = revenueService.formatListingRevenueData(latestRecord);
            
            res.json({
              success: true,
              data: formattedData,
              total: allRecords.total,
              limit: limit,
              message: `Listing revenue data loaded successfully (${allRecords.total} records, limit: ${limit})`
            });
          } else {
            res.json({
              success: false,
              data: null,
              message: 'No listing revenue data available'
            });
          }
        } else {
          // Get latest record only (original behavior)
          const latestRecord = await revenueService.getTodayListingRevenueRecord();
          
          if (latestRecord.success && latestRecord.record) {
            const formattedData = revenueService.formatListingRevenueData(latestRecord.record);
            
            res.json({
              success: true,
              data: formattedData,
              message: 'Listing revenue data loaded successfully'
            });
          } else {
            res.json({
              success: false,
              data: null,
              message: 'No listing revenue data available'
            });
          }
        }
        
      } catch (error) {
        console.error('❌ Error serving listing revenue data to frontend:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to load listing revenue data'
        });
      }
    });

    // Get today's revenue data specifically
    router.get('/today-revenue', async (req, res) => {
      try {
        console.log('📊 Frontend requesting today\'s revenue data...');
        
        const todayRecord = await revenueService.getTodayRevenueRecord();
        
        if (todayRecord.success && todayRecord.record) {
          const formattedData = revenueService.formatRevenueData(todayRecord.record);
          
          res.json({
            success: true,
            data: formattedData,
            message: 'Today\'s revenue data loaded successfully'
          });
        } else {
          res.json({
            success: false,
            data: null,
            message: 'No revenue data available for today'
          });
        }
        
      } catch (error) {
        console.error('❌ Error serving today\'s revenue data:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to load today\'s revenue data'
        });
      }
    });

    // Manual trigger for revenue update (for testing)
    router.post('/update-revenue', async (req, res) => {
      try {
        console.log('🔄 Manual revenue update triggered...');
        
        const result = await revenueService.integrateWithExistingRevenue();
        
        res.json({
          success: result.success,
          message: result.success ? 'Revenue updated successfully' : 'Failed to update revenue',
          error: result.error || null
        });
        
      } catch (error) {
        console.error('❌ Error in manual revenue update:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to update revenue'
        });
      }
    });

    // Test endpoint for listing revenue
    router.get('/test-listing', (req, res) => {
      res.json({
        success: true,
        message: 'Listing revenue route is working!',
        timestamp: new Date().toISOString()
      });
    });

    // Initial population endpoint for listing revenue
    router.post('/populate-listing-initial', async (req, res) => {
      try {
        console.log('🚨🚨🚨 POPULATE-LISTING-INITIAL ROUTE CALLED 🚨🚨🚨');
        console.log('🏠 Initial listing revenue database population triggered...');
        
        // Get listing revenue data from existing system
        const listingRevenueData = await revenueService.getCalculatedListingRevenueFromExistingSystem();
        
        // Run the integration to populate listing database
        const result = await revenueService.createOrUpdateTodayListingRevenue(listingRevenueData);
        
        if (result.success) {
          // Also get the stored data to confirm
          const latestRecord = await revenueService.getTodayListingRevenueRecord();
          
          res.json({
            success: true,
            message: 'Listing revenue database populated successfully! Data is now available.',
            data: latestRecord.record ? revenueService.formatListingRevenueData(latestRecord.record) : null
          });
        } else {
          res.json({
            success: false,
            message: 'Failed to populate listing revenue database',
            error: result.error
          });
        }
        
      } catch (error) {
        console.error('❌ Error in listing revenue initial population:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to populate listing revenue database'
        });
      }
    });

    // Initial population endpoint (run this once to populate database)
    router.post('/populate-initial', async (req, res) => {
      try {
        console.log('🚀 Initial database population triggered...');
        
        // Run the integration to populate database
        const result = await revenueService.integrateWithExistingRevenue();
        
        if (result.success) {
          // Also get the stored data to confirm
          const latestRecord = await revenueService.getLatestRevenueRecord();
          
          res.json({
            success: true,
            message: 'Database populated successfully! Revenue data is now available.',
            data: latestRecord.record ? revenueService.formatRevenueData(latestRecord.record) : null
          });
        } else {
          res.json({
            success: false,
            message: 'Failed to populate database',
            error: result.error
          });
        }
        
      } catch (error) {
        console.error('❌ Error in initial population:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Failed to populate database'
        });
      }
    });

    // Test database connection
    router.get('/test-connection', async (req, res) => {
      try {
        const result = await revenueService.testConnection();
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Test pagination functionality with optional limit
    router.get('/test-pagination', async (req, res) => {
      try {
        console.log('🧪 API: Testing pagination functionality...');
        
        // Get limit from query parameter (default: 200 for testing)
        const limit = req.query.limit ? parseInt(req.query.limit) : 200;
        console.log(`🧪 Testing with limit: ${limit} records`);
        
        const result = await revenueService.testPagination();
        
        // Also test with custom limit
        const limitedTest = await revenueService.getAllRevenueRecords(limit);
        
        res.json({
          ...result,
          limitTest: {
            limit: limit,
            totalFetched: limitedTest.total,
            pages: limitedTest.pages,
            message: `Limited test: ${limitedTest.total} records with limit ${limit}`
          }
        });
      } catch (error) {
        console.error('❌ API: Pagination test failed:', error.message);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Pagination test failed'
        });
      }
    });

    console.log('✅ RevenueTable API routes created successfully');
    return router;
  }

  // Frontend integration helper - formats data for your existing frontend components
  formatForFrontend(record) {
    if (!record) return null;
    
    const formatted = this.formatRevenueData(record);
    
    // Format to match your existing frontend expectations
    return {
      // Main revenue fields
      actualRevenue: formatted.actualRevenue,
      expectedRevenue: formatted.expectedRevenue,
      
      // Target achievements
      dailyTarget: {
        achieved: formatted.dailyTargetAchieved,
        percentage: formatted.dailyTargetAchieved // Adjust calculation as needed
      },
      monthlyTarget: {
        achieved: formatted.monthlyTargetAchieved,
        percentage: formatted.monthlyTargetAchieved // Adjust calculation as needed
      },
      quarterlyTarget: {
        achieved: formatted.quarterlyTargetAchieved,
        percentage: formatted.quarterlyTargetAchieved // Adjust calculation as needed
      },
      
      // Metadata
      lastUpdated: formatted.createdTime
    };
  }
}

// Export both the class and router for easy integration
module.exports = {
  RevenueTableService,
  createRevenueAPIRoutes: RevenueTableService.createAPIRoutes
};
