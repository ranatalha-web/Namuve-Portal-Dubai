const axios = require('axios');
const fetch = require('node-fetch');
const config = require('../config/config');

class TeableSchedulerService {
  constructor() {
    this.intervals = [];
    this.isRunning = false;
    this.SYNC_INTERVAL = 1 * 60 * 1000; // 1 minute in milliseconds
    this.BASE_URL = 'http://localhost:5000';
    this.HOSTAWAY_AUTH_TOKEN = config.HOSTAWAY_AUTH_TOKEN;
  }

  /**
   * Fetch detailed listing information from Hostaway including Airbnb summary
   * @param {number} listingId - The listing ID
   * @returns {Promise<Object>} Detailed listing data
   */
  async fetchListingDetails(listingId) {
    try {
      const response = await axios.get(`https://api.hostaway.com/v1/listings/${listingId}`, {
        headers: {
          'Authorization': this.HOSTAWAY_AUTH_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return response.data?.result || null;
    } catch (error) {
      console.log(`⚠️ Could not fetch details for listing ${listingId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Determine room category from Airbnb summary, bedrooms, or accommodates
   * @param {Object} listingDetails - Detailed listing data
   * @param {string} apartmentName - Apartment name
   * @returns {string} Category (Studio, 1BR, 2BR, 3BR)
   */
  determineCategory(listingDetails, apartmentName) {
    // Check bedroomsNumber field first (most reliable from Hostaway)
    if (listingDetails?.bedroomsNumber !== undefined && listingDetails?.bedroomsNumber !== null) {
      const bedrooms = parseInt(listingDetails.bedroomsNumber);
      if (bedrooms === 0) return 'Studio';
      if (bedrooms === 1) return '1BR';
      if (bedrooms === 2) return '2BR';
      if (bedrooms >= 3) return '3BR';
    }

    // Check Airbnb summary
    if (listingDetails?.airbnbSummary) {
      const summary = listingDetails.airbnbSummary.toLowerCase();
      
      if (summary.includes('studio') || summary.includes('0 bedroom')) {
        return 'Studio';
      } else if (summary.includes('3 bedroom') || summary.includes('3-bedroom')) {
        return '3BR';
      } else if (summary.includes('2 bedroom') || summary.includes('2-bedroom')) {
        return '2BR';
      } else if (summary.includes('1 bedroom') || summary.includes('1-bedroom')) {
        return '1BR';
      }
    }

    // Check bedrooms field
    if (listingDetails?.bedrooms) {
      const bedrooms = parseInt(listingDetails.bedrooms);
      if (bedrooms === 0) return 'Studio';
      if (bedrooms === 1) return '1BR';
      if (bedrooms === 2) return '2BR';
      if (bedrooms >= 3) return '3BR';
    }

    // Check accommodates field
    if (listingDetails?.accommodates) {
      const accommodates = parseInt(listingDetails.accommodates);
      if (accommodates <= 2) return 'Studio';
      if (accommodates <= 4) return '1BR';
      if (accommodates <= 6) return '2BR';
      return '3BR';
    }

    // Fallback to apartment name parsing
    const name = apartmentName.toLowerCase();
    if (name.includes('studio') || name.includes('(s)')) return 'Studio';
    if (name.includes('3br') || name.includes('3 br') || name.includes('(3b)')) return '3BR';
    if (name.includes('2br') || name.includes('2 br') || name.includes('(2b)')) return '2BR';
    if (name.includes('1br') || name.includes('1 br') || name.includes('(1b)')) return '1BR';

    return '';
  }

  // Fetch occupancy data and sync rooms
  async syncRooms() {
    try {
      console.log('🏠 Fetching occupancy data...');
      
      const response = await fetch(`${this.BASE_URL}/api/occupancy/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Occupancy API returned ${response.status}`);
      }

      const data = await response.json();
      const occupancyData = data.success && data.data ? data.data : data;

      // Sync to Teable
      console.log('🔄 Syncing rooms to Teable...');
      const syncResponse = await fetch(`${this.BASE_URL}/api/rooms-teable/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ occupancyData })
      });

      const syncResult = await syncResponse.json();
      console.log('✅ Rooms synced:', syncResult);
      return syncResult;

    } catch (error) {
      console.error('❌ Error syncing rooms:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Fetch room availability and sync
  async syncRoomAvailability() {
    try {
      console.log('📊 Fetching room availability data...');
      
      const response = await fetch(`${this.BASE_URL}/api/rooms/availability`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Availability API returned ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid availability data format');
      }

      // Map to Teable format
      const roomTypeCounts = {};
      data.data.roomTypes.forEach(rt => {
        roomTypeCounts[rt.roomType] = rt.total || 0;
      });

      const availabilityPayload = {
        studio: roomTypeCounts["Studio"] || 0,
        twoBRPremium: roomTypeCounts["2BR Premium"] || 0,
        threeBR: roomTypeCounts["3BR"] || 0,
        oneBR: roomTypeCounts["1BR"] || 0,
        available: data.data.summary?.totalAvailable || 0,
        reserved: data.data.summary?.totalReserved || 0,
        twoBR: roomTypeCounts["2BR"] || 0,
        blocked: data.data.summary?.totalBlocked || 0
      };

      console.log('🔄 Syncing room availability to Teable...');
      const syncResponse = await fetch(`${this.BASE_URL}/api/room-availability-teable/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ availabilityData: availabilityPayload })
      });

      const syncResult = await syncResponse.json();
      console.log('✅ Room availability synced:', syncResult);
      
      // Return both the sync result and the full data for room details sync
      return { syncResult, fullData: data.data };

    } catch (error) {
      console.error('❌ Error syncing room availability:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Sync room details (apartment-level data)
  async syncRoomDetails(availabilityData) {
    try {
      console.log('🏢 Syncing room details to Teable...');
      
      if (!availabilityData || !availabilityData.roomTypes) {
        throw new Error('No availability data provided for room details sync');
      }

      // Collect all apartments from all room types
      const allApartments = [];
      
      for (const roomType of availabilityData.roomTypes) {
        if (roomType.apartments) {
          // Combine available, reserved, and blocked apartments
          const apartments = [
            ...(roomType.apartments.available || []),
            ...(roomType.apartments.reserved || []),
            ...(roomType.apartments.blocked || [])
          ];
          
          for (const apt of apartments) {
            const apartmentName = apt.internalName || apt.name;
            
            // Use the room type from availability data
            // This is already correctly determined from bedroomsNumber in the occupancy API
            const category = roomType.roomType;
            
            allApartments.push({
              apartmentName: apartmentName,
              category: category,
              available: apt.status === 'available' ? 1 : 0,
              reserved: apt.status === 'reserved' ? 1 : 0,
              blocked: apt.status === 'blocked' ? 1 : 0
            });
          }
        }
      }

      if (allApartments.length === 0) {
        console.log('⚠️ No apartment details to sync');
        return { success: true, message: 'No apartments to sync' };
      }

      console.log(`📤 Syncing ${allApartments.length} apartment details...`);

      const syncResponse = await fetch(`${this.BASE_URL}/api/room-details-teable/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomDetails: allApartments })
      });

      const syncResult = await syncResponse.json();
      console.log('✅ Room details synced:', syncResult);
      return syncResult;

    } catch (error) {
      console.error('❌ Error syncing room details:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Sync yesterday/today reservations
  async syncYesterdayTodayReservations() {
    try {
      console.log('📅 Syncing yesterday/today reservations...');
      
      const response = await fetch(`${this.BASE_URL}/api/teable-room/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      console.log('✅ Yesterday/today reservations synced:', result);
      return result;

    } catch (error) {
      console.error('❌ Error syncing yesterday/today reservations:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Main sync function
  async performSync() {
    const startTime = Date.now();
    console.log('\n🔄 ========== STARTING AUTOMATIC TEABLE SYNC ==========');
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);

    const results = {
      rooms: null,
      availability: null,
      roomDetails: null,
      yesterdayToday: null
    };

    try {
      // 1. Sync Rooms (Reservations)
      console.log('\n📋 Step 1: Syncing Rooms...');
      results.rooms = await this.syncRooms();

      // 2. Sync Room Availability
      console.log('\n📊 Step 2: Syncing Room Availability...');
      const availabilityResult = await this.syncRoomAvailability();
      results.availability = availabilityResult.syncResult || availabilityResult;

      // 3. Sync Room Details (if we have full data)
      if (availabilityResult.fullData) {
        console.log('\n🏢 Step 3: Syncing Room Details...');
        results.roomDetails = await this.syncRoomDetails(availabilityResult.fullData);
      }

      // 4. Sync Yesterday/Today Reservations
      console.log('\n📅 Step 4: Syncing Yesterday/Today Reservations...');
      results.yesterdayToday = await this.syncYesterdayTodayReservations();

      const syncTime = Date.now() - startTime;
      console.log(`\n✅ ========== SYNC COMPLETED IN ${syncTime}ms ==========\n`);

      return {
        success: true,
        syncTime,
        timestamp: new Date().toISOString(),
        results
      };

    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      const syncTime = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        syncTime,
        results
      };
    }
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Teable scheduler is already running');
      return;
    }

    console.log('🚀 Starting Teable automatic sync scheduler...');
    console.log(`⏰ Sync interval: ${this.SYNC_INTERVAL / 1000 / 60} minutes`);

    // Perform initial sync
    this.performSync();

    // Schedule periodic syncs
    const intervalId = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL);

    this.intervals.push(intervalId);
    this.isRunning = true;

    console.log('✅ Teable scheduler started successfully');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Teable scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Teable scheduler...');

    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });

    this.intervals = [];
    this.isRunning = false;

    console.log('✅ Teable scheduler stopped');
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.SYNC_INTERVAL,
      syncIntervalMinutes: this.SYNC_INTERVAL / 1000 / 60,
      activeIntervals: this.intervals.length
    };
  }
}

// Create singleton instance
const teableScheduler = new TeableSchedulerService();

module.exports = teableScheduler;
