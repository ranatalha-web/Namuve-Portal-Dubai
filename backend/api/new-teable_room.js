const axios = require('axios');

/**
 * New Teable Room Reservation Database Service
 * Syncs yesterday/today reservation data from Hostaway to Teable database
 * Frontend reads from Teable instead of calling Hostaway API directly
 * This eliminates slow API calls and improves frontend loading time to <5 seconds
 */

class TeableRoomReservationService {
  constructor() {
    this.tableUrl = process.env.TEABLE_ROOM_RESERVATIONS_TABLE_URL;
    this.bearerToken = process.env.TEABLE_ROOM_RESERVATIONS_BEARER_TOKEN;
    this.hostawayAuthToken = process.env.HOSTAWAY_AUTH_TOKEN;
  }

  /**
   * STEP 1: Delete all existing records from Teable
   * Clears the table before syncing new data
   */
  async deleteAllRecords() {
    try {
      console.log('🗑️ Deleting all existing records from Teable...');
      
      // Fetch all records first
      const response = await axios.get(this.tableUrl, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      const records = response.data.records || [];
      console.log(`📊 Found ${records.length} records to delete`);

      // Delete each record
      for (const record of records) {
        try {
          await axios.delete(`${this.tableUrl}/${record.id}`, {
            headers: {
              'Authorization': `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (err) {
          console.warn(`⚠️ Failed to delete record ${record.id}:`, err.message);
        }
      }

      console.log(`✅ Deleted ${records.length} records from Teable`);
      return true;
    } catch (err) {
      console.error('❌ Error deleting records:', err.message);
      return false;
    }
  }

  /**
   * STEP 2: Fetch yesterday/today reservations from Hostaway
   * Gets all Dubai listings and their reservations
   */
  async fetchYesterdayTodayFromHostaway() {
    try {
      console.log('📅 Fetching yesterday/today reservations from Hostaway...');
      
      if (!this.hostawayAuthToken) {
        throw new Error('HOSTAWAY_AUTH_TOKEN not configured');
      }

      // Get current date in Dubai timezone (UTC+4)
      const now = new Date();
      const dubaiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
      const todayStr = dubaiTime.getFullYear() + '-' + 
        String(dubaiTime.getMonth() + 1).padStart(2, '0') + '-' + 
        String(dubaiTime.getDate()).padStart(2, '0');
      
      // Calculate yesterday
      const yesterdayDate = new Date(dubaiTime);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.getFullYear() + '-' + 
        String(yesterdayDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(yesterdayDate.getDate()).padStart(2, '0');

      console.log(`📍 Yesterday: ${yesterdayStr}, Today: ${todayStr}`);

      // Fetch all listings to identify Dubai properties
      let allListings = [];
      let listingOffset = 0;
      const listingLimit = 1000;
      let listingHasMore = true;

      while (listingHasMore) {
        try {
          const listingsUrl = `https://api.hostaway.com/v1/listings?limit=${listingLimit}&offset=${listingOffset}`;
          const listingsResponse = await axios.get(listingsUrl, {
            headers: {
              Authorization: this.hostawayAuthToken,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });

          const listings = listingsResponse.data.result || [];
          allListings = allListings.concat(listings);

          if (listings.length < listingLimit) {
            listingHasMore = false;
          } else {
            listingOffset += listingLimit;
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch listings:', err.message);
          listingHasMore = false;
        }
      }

      // Filter for Dubai listings
      const dubaiListingIds = allListings
        .filter(listing => {
          const city = listing.city || listing.location || listing.address || '';
          const cityLower = city.toLowerCase();
          return cityLower.includes('dubai') || cityLower.includes('uae');
        })
        .map(listing => listing.id);

      console.log(`✅ Found ${dubaiListingIds.length} Dubai listings`);

      // Create a map of listing IDs to listing names and cleaning status
      const listingNameMap = new Map();
      const listingCleaningStatusMap = new Map();
      allListings.forEach(listing => {
        const listingName = listing.internalListingName || listing.title || listing.name || `Unit ${listing.id}`;
        listingNameMap.set(listing.id, listingName);
        
        // Map cleaning status from Hostaway
        const cleannessStatus = parseInt(listing.cleannessStatus) || listing.cleannessStatus;
        const hwStatus = cleannessStatus === 1 ? 'Clean' : cleannessStatus === 2 ? 'Not Clean' : 'Unknown';
        const hkStatus = cleannessStatus === 1 ? 'Clean' : cleannessStatus === 2 ? 'Not Clean' : 'Unknown';
        
        listingCleaningStatusMap.set(listing.id, {
          hwStatus: hwStatus,
          hkStatus: hkStatus,
          cleannessStatus: cleannessStatus
        });
      });

      // Fetch all reservations
      let allReservations = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const baseReservationsUrl = `https://api.hostaway.com/v1/reservations?includeResources=1&limit=${limit}&offset=${offset}`;
        
        const response = await axios.get(baseReservationsUrl, {
          headers: {
            Authorization: this.hostawayAuthToken,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        });

        const reservations = response.data.result || [];
        const dubaiReservations = reservations.filter(res => dubaiListingIds.includes(res.listingMapId));
        allReservations = allReservations.concat(dubaiReservations);

        if (reservations.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      console.log(`📊 Fetched ${allReservations.length} total Dubai reservations`);

      // Organize reservations by listing ID
      const reservationsByListing = {};

      for (const res of allReservations) {
        if (!res.arrivalDate || !res.departureDate) continue;
        if (!['new', 'modified'].includes(res.status)) continue;

        const arrival = new Date(res.arrivalDate);
        const departure = new Date(res.departureDate);
        const yesterdayDate = new Date(yesterdayStr);
        const todayDate = new Date(todayStr);

        // Check if reservation is on yesterday or today
        const isYesterday = (yesterdayDate >= arrival && yesterdayDate < departure);
        const isToday = (todayDate >= arrival && todayDate < departure);

        if (!isYesterday && !isToday) continue;

        // Skip test guests
        const guestName = res.guestName || res.firstName || res.lastName || 
                         res.guest?.firstName || res.guest?.lastName || '';
        const isTestGuest = !guestName ||
          /test|testing|guests|new guest|test guest|new/i.test(guestName) ||
          (res.comment && /test|testing|new guest/i.test(res.comment)) ||
          (res.guestNote && /test|testing|new guest/i.test(res.guestNote));
        
        if (isTestGuest) continue;

        const listingId = res.listingMapId;
        if (!reservationsByListing[listingId]) {
          const cleaningStatus = listingCleaningStatusMap.get(listingId) || { hwStatus: 'N/A', hkStatus: 'N/A' };
          reservationsByListing[listingId] = {
            listingId: listingId,
            internalListingName: listingNameMap.get(listingId) || `Unit ${listingId}`,
            hwStatus: cleaningStatus.hwStatus,
            hkStatus: cleaningStatus.hkStatus,
            yesterday: null,
            today: null
          };
        }

        const reservationData = {
          guestName: guestName || 'Unknown Guest',
          reservationId: res.id,
          arrivalDate: res.arrivalDate,
          departureDate: res.departureDate,
          status: isYesterday && !isToday ? 'Checked Out' : 
                  isToday && !isYesterday ? 'Upcoming Stay' :
                  'Staying Guest'
        };

        if (isYesterday && !isToday) {
          reservationsByListing[listingId].yesterday = reservationData;
        } else if (isToday && !isYesterday) {
          reservationsByListing[listingId].today = reservationData;
        } else if (isYesterday && isToday) {
          // Staying guest - assign to today
          reservationsByListing[listingId].today = {
            ...reservationData,
            status: 'Staying Guest'
          };
        }
      }

      const result = Object.values(reservationsByListing);
      console.log(`✅ Organized ${result.length} listings with yesterday/today reservations`);
      
      return result;
    } catch (error) {
      console.error('❌ Error fetching from Hostaway:', error.message);
      return [];
    }
  }

  /**
   * STEP 3: POST new records to Teable
   * Creates new records with all reservation data
   */
  async postRecordsToTeable(reservationData) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 STARTING POST TO TEABLE`);
      console.log(`📊 Total records to post: ${reservationData.length}`);
      console.log(`🔗 Teable URL: ${this.tableUrl}`);
      console.log(`🔐 Bearer token length: ${this.bearerToken?.length || 0} chars`);
      console.log(`${'='.repeat(80)}\n`);

      let successCount = 0;
      let failureCount = 0;

      for (let index = 0; index < reservationData.length; index++) {
        const data = reservationData[index];
        
        console.log(`\n📍 Processing record ${index + 1}/${reservationData.length}`);
        console.log(`   Apartment: ${data.internalListingName}`);
        console.log(`   Listing ID: ${data.listingId}`);

        const fields = {
          'Listing ID ': String(data.listingId),
          'internalListingName': data.internalListingName,
          'activity': data.today ? 'Occupied' : 'Vacant',
          'hwStatus': data.hwStatus || 'N/A',
          'hkStatus': data.hkStatus || 'N/A',
          'yGuestName': data.yesterday?.guestName || 'N/A',
          'yReservationId': String(data.yesterday?.reservationId || 'N/A'),
          'yCheckInDate': data.yesterday?.arrivalDate ? data.yesterday.arrivalDate.split('T')[0] : 'N/A',
          'yCheckOutDate': data.yesterday?.departureDate ? data.yesterday.departureDate.split('T')[0] : 'N/A',
          'yReservationStatus': data.yesterday?.status || 'N/A',
          'guestName': data.today?.guestName || 'N/A',
          'reservationId': String(data.today?.reservationId || 'N/A'),
          'checkInDate': data.today?.arrivalDate ? data.today.arrivalDate.split('T')[0] : 'N/A',
          'checkOutDate': data.today?.departureDate ? data.today.departureDate.split('T')[0] : 'N/A',
          'reservationStatus': data.today?.status || 'N/A',
          'activity Today': data.today ? 'Occupied' : 'Vacant'
        };

        console.log(`   📋 Fields to post:`);
        console.log(`      - Listing ID: ${fields['Listing ID ']}`);
        console.log(`      - HW Status: ${fields['hwStatus']}`);
        console.log(`      - HK Status: ${fields['hkStatus']}`);
        console.log(`      - Guest Name (Today): ${fields['guestName']}`);
        console.log(`      - Guest Name (Yesterday): ${fields['yGuestName']}`);
        console.log(`      - Activity: ${fields['activity']}`);
        console.log(`      - Activity Today: ${fields['activity Today']}`);

        try {
          console.log(`   🔄 Preparing POST request...`);
          
          const requestPayload = {
            records: [{
              fields: fields
            }]
          };

          console.log(`   📤 Request payload size: ${JSON.stringify(requestPayload).length} bytes`);
          console.log(`   🌐 POST to: ${this.tableUrl}`);
          
          const response = await axios.post(this.tableUrl, requestPayload, {
            headers: {
              'Authorization': `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          });

          console.log(`   ✅ SUCCESS! Status: ${response.status}`);
          console.log(`   📦 Response data:`, response.data);
          successCount++;

        } catch (err) {
          failureCount++;
          console.error(`   ❌ FAILED!`);
          console.error(`   Status Code: ${err.response?.status || 'No status'}`);
          console.error(`   Error Message: ${err.message}`);
          console.error(`   Response Data:`, err.response?.data || 'No response data');
          console.error(`   Request Config:`, {
            url: err.config?.url,
            method: err.config?.method,
            headers: err.config?.headers ? { ...err.config.headers, Authorization: '***HIDDEN***' } : 'No headers'
          });
          
          if (err.code) {
            console.error(`   Error Code: ${err.code}`);
          }
          if (err.errno) {
            console.error(`   Error Number: ${err.errno}`);
          }
        }
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 POST SUMMARY`);
      console.log(`✅ Success: ${successCount}/${reservationData.length}`);
      console.log(`❌ Failed: ${failureCount}/${reservationData.length}`);
      console.log(`📈 Success Rate: ${((successCount / reservationData.length) * 100).toFixed(2)}%`);
      console.log(`${'='.repeat(80)}\n`);

      return failureCount === 0;
    } catch (error) {
      console.error('❌ CRITICAL ERROR in postRecordsToTeable:', error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  }

  /**
   * STEP 4: Sync all data (Delete → Fetch → Post)
   * Complete sync process from Hostaway to Teable
   */
  async syncAllData() {
    try {
      console.log('\n' + '█'.repeat(80));
      console.log('🔄 STARTING COMPLETE SYNC PROCESS');
      console.log('█'.repeat(80) + '\n');

      // Step 1: Delete all existing records
      console.log('⏳ STEP 1: Deleting existing records from Teable...');
      const deleteResult = await this.deleteAllRecords();
      console.log(deleteResult ? '✅ Delete completed' : '⚠️ Delete had issues\n');

      // Step 2: Fetch from Hostaway
      console.log('\n⏳ STEP 2: Fetching yesterday/today reservations from Hostaway...');
      const reservationData = await this.fetchYesterdayTodayFromHostaway();
      console.log(`✅ Fetched ${reservationData.length} listings\n`);

      if (reservationData.length === 0) {
        console.warn('⚠️ No reservation data to sync');
        return {
          success: false,
          message: 'No reservation data found',
          synced: 0
        };
      }

      // Step 3: Post to Teable
      console.log('\n⏳ STEP 3: Posting records to Teable...');
      const postResult = await this.postRecordsToTeable(reservationData);

      console.log('\n' + '█'.repeat(80));
      console.log('🎉 SYNC PROCESS COMPLETED');
      console.log('█'.repeat(80) + '\n');

      return {
        success: postResult,
        message: `Synced ${reservationData.length} records`,
        synced: reservationData.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('\n❌ SYNC FAILED:', error.message);
      console.error('Stack trace:', error.stack);
      return {
        success: false,
        error: error.message,
        synced: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET all records from Teable
   * Frontend calls this to get all reservation data
   */
  async getAllRecords() {
    try {
      console.log('📖 Fetching all records from Teable...');
      
      const response = await axios.get(this.tableUrl, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      const records = response.data.records || [];
      console.log(`✅ Retrieved ${records.length} records from Teable`);

      // Transform records to match frontend format
      const transformedRecords = records.map(record => ({
        listingId: parseInt(record.fields['Listing ID ']) || 0,
        internalListingName: record.fields['internalListingName'] || 'N/A',
        activity: record.fields['activity'] || 'Vacant',
        hwStatus: record.fields['hwStatus'] || 'N/A',
        hkStatus: record.fields['hkStatus'] || 'N/A',
        yGuestName: record.fields['yGuestName'] || 'N/A',
        yReservationId: record.fields['yReservationId'] || 'N/A',
        yCheckInDate: record.fields['yCheckInDate'] || 'N/A',
        yCheckOutDate: record.fields['yCheckOutDate'] || 'N/A',
        yReservationStatus: record.fields['yReservationStatus'] || 'N/A',
        guestName: record.fields['guestName'] || 'N/A',
        reservationId: record.fields['reservationId'] || 'N/A',
        checkInDate: record.fields['checkInDate'] || 'N/A',
        checkOutDate: record.fields['checkOutDate'] || 'N/A',
        reservationStatus: record.fields['reservationStatus'] || 'N/A',
        activityToday: record.fields['activity Today'] || 'Vacant'
      }));

      return {
        success: true,
        data: transformedRecords,
        count: transformedRecords.length
      };
    } catch (error) {
      console.error('❌ Error fetching records:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

module.exports = TeableRoomReservationService;
