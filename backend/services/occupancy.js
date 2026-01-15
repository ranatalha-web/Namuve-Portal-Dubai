const axios = require('axios');
const config = require('../src/config/config');

class OccupancyService {
  constructor() {
    this.teableApiUrl = 'https://teable.namuve.com/api/table/tblg8UqsmbyTMeZV1j8/record';
    this.bearerToken = 'teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=';
    this.hostawayAuthToken = config.HOSTAWAY_AUTH_TOKEN;
  }

  /**
   * Fetch actual checked-in reservations from Hostaway API
   */
  async fetchActualCheckedInReservations() {
    try {
      console.log('🏨 Fetching TODAY\'S check-ins from DUBAI LISTINGS ONLY from Hostaway...');

      if (!this.hostawayAuthToken) {
        throw new Error('HOSTAWAY_AUTH_TOKEN not configured');
      }

      // Get current date in Dubai timezone (UTC+4)
      const now = new Date();
      const dubaiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
      const formattedToday = dubaiTime.getFullYear() + '-' +
        String(dubaiTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(dubaiTime.getDate()).padStart(2, '0');

      console.log(`📍 Dubai timezone date: ${formattedToday}`);
      console.log(`📍 Dynamically fetching Dubai listings from Hostaway...`);

      // First, fetch all listings to identify Dubai properties
      console.log('🔍 Fetching all listings to identify Dubai properties...');
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
          console.warn('⚠️ Could not fetch listings, will use all reservations:', err.message);
          listingHasMore = false;
        }
      }

      // Filter for Dubai listings dynamically (check city/location field)
      const dubaiListingIds = allListings
        .filter(listing => {
          const city = listing.city || listing.location || listing.address || '';
          const cityLower = city.toLowerCase();
          // Check if listing is in Dubai
          return cityLower.includes('dubai') || cityLower.includes('uae');
        })
        .map(listing => listing.id);

      console.log(`✅ Found ${dubaiListingIds.length} Dubai listings dynamically`);
      console.log(`📍 Dubai listing IDs: ${dubaiListingIds.join(', ')}`);

      // Fetch all reservations with pagination (up to 1000 per request)
      let allReservations = [];
      let offset = 0;
      const limit = 1000; // Hostaway limit per request
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

        // Filter for Dubai listings only (dynamically identified)
        const dubaiReservations = reservations.filter(res =>
          dubaiListingIds.includes(res.listingMapId)
        );

        allReservations = allReservations.concat(dubaiReservations);

        // If we got fewer than limit, we've reached the end
        if (reservations.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      console.log(`📊 Fetched ${allReservations.length} total DUBAI reservations from Hostaway`);

      let actualCheckedInCount = 0;
      const checkedInListings = [];

      if (allReservations && allReservations.length > 0) {
        // Filter reservations to include those checking in TODAY OR currently staying (within stay period)
        const reservations = allReservations.filter(res => {
          if (!res.arrivalDate || !res.departureDate) return false;
          if (!['new', 'modified'].includes(res.status)) return false;

          const arrival = new Date(res.arrivalDate);
          const departure = new Date(res.departureDate);
          const todayDate = new Date(formattedToday);

          // Include reservations where today is within the stay period (arrival <= today < departure)
          const isWithinStayPeriod = (todayDate >= arrival && todayDate < departure);

          if (!isWithinStayPeriod) return false;

          // Check for test guests
          const guestName = res.guestName || res.firstName || res.lastName ||
            res.guest?.firstName || res.guest?.lastName ||
            res.guestFirstName || res.guestLastName || '';
          const isTestGuest = !guestName ||
            /test|testing|guests|new guest|test guest|new/i.test(guestName) ||
            (res.comment && /test|testing|new guest/i.test(res.comment)) ||
            (res.guestNote && /test|testing|new guest/i.test(res.guestNote));

          return !isTestGuest;
        });

        // Process each reservation within stay period
        for (const res of reservations) {
          const arrival = new Date(res.arrivalDate);
          const departure = new Date(res.departureDate);
          const todayDate = new Date(formattedToday);

          // Process reservations where today is within the stay period (including staying guests)
          if (todayDate >= arrival && todayDate < departure) {
            actualCheckedInCount++;

            // Log ALL fields in the first reservation to see what's available
            if (actualCheckedInCount === 1) {
              console.log(`🔍 === FIRST RESERVATION STRUCTURE ===`);
              console.log(`All fields:`, Object.keys(res));
              console.log(`Full reservation object:`, JSON.stringify(res, null, 2));
              console.log(`=== END FIRST RESERVATION ===`);
            }

            // Determine if this is today's check-in or staying guest
            const isCheckInToday = arrival.toDateString() === todayDate.toDateString();
            const guestType = isCheckInToday ? 'Today\'s Check-in' : 'Staying Guest';

            // Extract guest name from various possible fields
            const guestName = res.guestName || res.firstName || res.lastName || res.guest?.firstName || res.guest?.lastName || 'Unknown Guest';

            console.log(`👤 Processing reservation - ID: ${res.id}, ListingID: ${res.listingMapId}, Guest: "${guestName}", Arrival: ${res.arrivalDate}`);

            checkedInListings.push({
              listingId: res.listingMapId,
              guestName: guestName,
              reservationId: res.id,
              guestType: guestType,
              originalCheckInDate: res.arrivalDate
            });
          }
        }
      }

      console.log(`✅ Found ${actualCheckedInCount} reservations (check-ins + staying guests) with actual check-in times`);
      console.log(`📋 Current occupancy listings count: ${checkedInListings.length}`);
      if (checkedInListings.length > 0) {
        console.log(`📋 First occupancy listing:`, JSON.stringify(checkedInListings[0], null, 2));
      } else {
        console.warn(`⚠️ NO GUEST RECORDS FOUND!`);
      }

      // Fetch all listings to get their names for mapping (DUBAI ONLY)
      let hostawayListings = [];
      let hostawayOffset = 0;
      const hostawayLimit = 1000;
      let hostawayHasMore = true;

      while (hostawayHasMore) {
        try {
          const listingsUrl = `https://api.hostaway.com/v1/listings?limit=${hostawayLimit}&offset=${hostawayOffset}`;
          const listingsResponse = await axios.get(listingsUrl, {
            headers: {
              Authorization: this.hostawayAuthToken,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });

          const listings = listingsResponse.data.result || [];

          // Filter for DUBAI listings only (exclude Pakistani listings)
          const dubaiListings = listings.filter(listing => {
            const city = listing.city || listing.location || listing.address || '';
            const country = listing.country || '';
            const cityLower = city.toLowerCase();
            const countryLower = country.toLowerCase();

            // Include only Dubai/UAE listings
            return cityLower.includes('dubai') || countryLower.includes('uae') || countryLower.includes('emirates');
          });

          hostawayListings = hostawayListings.concat(dubaiListings);

          if (listings.length < hostawayLimit) {
            hostawayHasMore = false;
          } else {
            hostawayOffset += hostawayLimit;
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch all listings:', err.message);
          hostawayHasMore = false;
        }
      }

      return {
        actualCheckedInCount,
        checkedInListings,
        allListings: hostawayListings
      };

    } catch (error) {
      console.error('❌ Error fetching actual checked-in reservations:', error.message);
      return {
        actualCheckedInCount: 0,
        checkedInListings: []
      };
    }
  }

  /**
   * Fetch occupancy data using actual check-in times from Hostaway
   */
  async fetchOccupancyData() {
    try {
      console.log('🏨 Fetching occupancy data using TODAY\'S actual check-in times...');

      // Get actual checked-in reservations from Hostaway
      const checkedInData = await this.fetchActualCheckedInReservations();
      console.log(`📊 checkedInData returned:`, {
        actualCheckedInCount: checkedInData.actualCheckedInCount,
        checkedInListingsCount: checkedInData.checkedInListings?.length || 0,
        allListingsCount: checkedInData.allListings?.length || 0
      });

      // Get room inventory from Teable for total room count
      const response = await axios.get(this.teableApiUrl, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          viewId: 'viwW3FRhLdnavc9Qlas'
        }
      });

      console.log('📊 Raw Teable response:', response.data);

      if (response.data && response.data.records) {
        const processedData = await this.processOccupancyData(response.data.records, checkedInData);
        return processedData;
      } else if (response.data && Array.isArray(response.data)) {
        // Handle case where response.data is directly an array of records
        const processedData = await this.processOccupancyData(response.data, checkedInData);
        return processedData;
      } else {
        console.log('📊 Full response structure:', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid response format from Teable API');
      }
    } catch (error) {
      console.error('❌ Error fetching occupancy data:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Process raw Teable data into occupancy report format using actual check-in data
   */
  async processOccupancyData(records, checkedInData = { actualCheckedInCount: 0, checkedInListings: [] }) {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: 'Asia/Karachi'
      });

      // Initialize room types
      const roomTypes = {
        'Studio': { available: 0, reserved: 0, total: 0 },
        '1BR': { available: 0, reserved: 0, total: 0 },
        '2BR': { available: 0, reserved: 0, total: 0 },
        '2BR Premium': { available: 0, reserved: 0, total: 0 },
        '3BR': { available: 0, reserved: 0, total: 0 }
      };

      let totalRooms = 0;
      let totalReserved = 0;
      let totalAvailableFromTeable = 0;
      let reservedRoomsList = [];

      // Get Dubai listing IDs from Hostaway (fully dynamic, no hardcoding)
      let dubaiListingIds = [];
      if (checkedInData.allListings && Array.isArray(checkedInData.allListings)) {
        dubaiListingIds = checkedInData.allListings.map(listing => listing.id);
        console.log(`🌍 Dubai listing IDs from Hostaway: ${dubaiListingIds.length} listings`);
      } else {
        console.warn('⚠️ No Dubai listings available from Hostaway - will process all Teable records');
      }

      console.log(`📍 Dubai Listing IDs: ${dubaiListingIds.join(', ')}`);
      console.log(`📍 Total listings to process: ${records.length}`);

      // Filter records for Dubai only FIRST
      const dubaiRecords = records.filter(record => {
        const fields = record.fields || record;
        const listingId = fields['Listing IDs'] || fields.listingId || fields.id;
        const isDubai = dubaiListingIds.includes(parseInt(listingId));

        if (!isDubai) {
          const listingName = fields['Listing Name'] || fields.listingName || fields.name;
          console.log(`🚫 FILTERED OUT: ${listingName} (ID: ${listingId}) - Not a Dubai listing`);
        }
        return isDubai;
      });

      console.log(`✅ Dubai records after filtering: ${dubaiRecords.length} out of ${records.length}`);

      // Process each Dubai record to get room inventory and match with actual check-ins
      dubaiRecords.forEach((record, index) => {
        console.log(`🔍 Processing Dubai record ${index + 1}:`, JSON.stringify(record, null, 2));

        const fields = record.fields || record;

        // Extract room type from "Listing Name" field (e.g., "9F-85 (3B)" -> "3BR")
        const listingName = fields['Listing Name'] || fields.listingName || fields.name;
        const listingId = fields['Listing IDs'] || fields.listingId || fields.id;

        console.log(`📋 Dubai Record ${index + 1} - Listing: ${listingName}, ID: ${listingId}`);

        // Extract room type based on listing name (fully dynamic, no hardcoding)
        let roomType = null;

        if (listingName) {
          // Use listing name for other room types
          if (listingName.includes('(3B)') || listingName.includes('3BR')) {
            roomType = '3BR';
          } else if (listingName.includes('(2B)') || listingName.includes('2BR')) {
            roomType = '2BR';
          } else if (listingName.includes('(1B)') || listingName.includes('1BR')) {
            roomType = '1BR';
          } else if (listingName.includes('Studio') || listingName.includes('(S)')) {
            roomType = 'Studio';
          }
        }

        // Determine if room is occupied based on Activity field from Teable
        const activity = fields['Activity'] || 'Vacant';
        const isOccupied = activity === 'Occupied';

        console.log(`🔍 Activity status for ${listingName} (ID: ${listingId}): ${activity} → Occupied: ${isOccupied}`);

        if (roomType && roomTypes[roomType]) {
          roomTypes[roomType].total++;
          totalRooms++;

          if (isOccupied) {
            roomTypes[roomType].reserved++;
            totalReserved++;
            const checkedInGuest = checkedInData.checkedInListings.find(checkedIn =>
              String(checkedIn.listingId) === String(listingId)
            );
            reservedRoomsList.push(`${listingName} (${roomType}) - Guest: "${checkedInGuest?.guestName || 'Unknown'}"`);
            console.log(`🔴 OCCUPIED: ${roomType} - ${listingName} (Guest: "${checkedInGuest?.guestName || 'Unknown'}")`);
          } else {
            roomTypes[roomType].available++;
            console.log(`🟢 AVAILABLE: ${roomType} - ${listingName} (No actual check-in)`);
          }
          console.log(`✅ Added ${roomType} - Occupied: ${isOccupied} | Running totals - Total: ${totalRooms}, Occupied: ${totalReserved}`);
        } else if (roomType) {
          console.log(`⚠️ Unknown room type: ${roomType}`);
        }
      });

      console.log(`📊 Final totals - Total Rooms: ${totalRooms}, Occupied (with actual check-ins): ${totalReserved}`);

      // Debug: Show final breakdown by room type
      console.log('📊 FINAL BREAKDOWN BY ROOM TYPE (BASED ON ACTUAL CHECK-INS):');
      Object.entries(roomTypes).forEach(([type, data]) => {
        console.log(`   ${type}: Total=${data.total}, Available=${data.available}, Occupied=${data.reserved}`);
      });

      // Calculate total occupied from room types to verify
      const calculatedOccupied = Object.values(roomTypes).reduce((sum, data) => sum + data.reserved, 0);
      console.log(`🔍 Calculated Occupied from room types: ${calculatedOccupied}`);
      console.log(`🔍 Tracked Occupied from counter: ${totalReserved}`);
      console.log(`🔍 Hostaway check-ins count: ${checkedInData.actualCheckedInCount}`);

      if (calculatedOccupied !== totalReserved) {
        console.log(`⚠️ MISMATCH DETECTED! Using calculated value: ${calculatedOccupied}`);
        totalReserved = calculatedOccupied;
      }

      // Create a map of listing IDs to listing names from Hostaway FIRST (before processing rooms)
      const hostawayListingMap = new Map();
      if (checkedInData.allListings && Array.isArray(checkedInData.allListings)) {
        console.log(`🗺️ Creating Hostaway listing map from ${checkedInData.allListings.length} Dubai listings`);
        checkedInData.allListings.forEach(listing => {
          const listingName = listing.internalListingName || listing.name || listing.title || `Unit ${listing.id}`;
          hostawayListingMap.set(String(listing.id), listingName);
          console.log(`   📍 Mapped listing ${listing.id}: "${listingName}"`);
        });
        console.log(`✅ Hostaway listing map created with ${hostawayListingMap.size} entries`);
      } else {
        console.warn('⚠️ No Hostaway listings available for mapping');
      }

      // Use guest data that was already fetched in fetchOccupancyData
      // Map checkedInListings to include listing names from Teable records or Hostaway
      console.log(`📊 Processing ${checkedInData.checkedInListings?.length || 0} guest records from checkedInData`);
      if (checkedInData.checkedInListings && checkedInData.checkedInListings.length > 0) {
        console.log(`📋 First guest record:`, JSON.stringify(checkedInData.checkedInListings[0], null, 2));
        console.log(`📋 All guest records count: ${checkedInData.checkedInListings.length}`);
        console.log(`📋 All guest records:`, JSON.stringify(checkedInData.checkedInListings, null, 2));
      } else {
        console.warn(`⚠️ NO GUEST RECORDS IN checkedInData!`);
      }

      const reservedRoomsDetails = (checkedInData.checkedInListings || []).map((checkedIn, idx) => {
        // Find the listing name from Teable records
        const teableRecord = records.find(r => {
          const listingId = r.fields?.['Listing IDs'] || r.fields?.listingId || r.id;
          return String(listingId) === String(checkedIn.listingId);
        });

        const teableListingName = teableRecord?.fields?.['Listing Name'];
        const hostawayListingName = hostawayListingMap.get(String(checkedIn.listingId));
        const finalListingName = teableListingName || hostawayListingName || `Unit ${checkedIn.listingId}`;

        console.log(`👤 Guest record mapping - ID: ${checkedIn.listingId}, Guest: "${checkedIn.guestName}", ResID: "${checkedIn.reservationId}", CheckInDate: "${checkedIn.originalCheckInDate}", Teable: "${teableListingName}", Hostaway: "${hostawayListingName}", Final: "${finalListingName}"`);

        const finalGuestName = checkedIn.guestName || 'Unknown Guest';
        const finalReservationId = checkedIn.reservationId || 'N/A';
        const finalCheckInDate = checkedIn.originalCheckInDate || 'N/A';

        console.log(`📝 Final values - Guest: "${finalGuestName}", ResID: "${finalReservationId}", CheckInDate: "${finalCheckInDate}"`);

        return {
          guestName: finalGuestName,
          listingName: finalListingName,
          listingId: checkedIn.listingId,
          reservationId: finalReservationId,
          actualCheckInTime: checkedIn.originalCheckInDate || 'N/A',
          guestType: checkedIn.guestType,
          checkInDate: finalCheckInDate
        };
      });

      // Add occupied rooms from Teable that don't have guest check-in data
      const occupiedListingIds = new Set(reservedRoomsDetails.map(r => r.listingId));

      const occupiedTeableRooms = records
        .filter(r => {
          const activity = r.fields?.['Activity'] || 'Vacant';
          const listingId = r.fields?.['Listing IDs'] || r.fields?.listingId || r.id;
          return activity === 'Occupied' && !occupiedListingIds.has(String(listingId));
        })
        .map(r => {
          const listingId = r.fields?.['Listing IDs'] || r.id;
          const teableListingName = r.fields?.['Listing Name'];
          const hostawayListingName = hostawayListingMap.get(String(listingId));
          const finalListingName = teableListingName || hostawayListingName || `Unit ${listingId}`;

          console.log(`🏠 Occupied room mapping - ID: ${listingId}, Teable: "${teableListingName}", Hostaway: "${hostawayListingName}", Final: "${finalListingName}"`);

          return {
            guestName: r.fields?.['(T) Guest Name'] || 'N/A',
            listingName: finalListingName,
            listingId: listingId,
            reservationId: r.fields?.['(T) Reservation ID'] || 'N/A',
            actualCheckInTime: r.fields?.['(T) Actual Check-in'] || 'N/A',
            guestType: 'Reserved',
            checkInDate: r.fields?.['(T) Check-In Date'] || 'N/A'
          };
        });

      // Combine both lists - ONLY DUBAI ROOMS
      // Keep only guest records (which are Dubai) + Dubai occupied rooms from Teable
      // Filter out Pakistani apartments (those from Teable without guest data)
      const allReservedRooms = reservedRoomsDetails; // Only guest records (Dubai with names)

      console.log(`✅ Using ${reservedRoomsDetails.length} guest records from checkedInData`);
      console.log(`✅ Adding ${occupiedTeableRooms.length} occupied rooms from Teable without guest data`);
      console.log(`✅ Total reserved rooms: ${allReservedRooms.length}`);
      console.log(`📅 Sample check-in dates:`, allReservedRooms.slice(0, 3).map(r => ({ guestName: r.guestName, checkInDate: r.checkInDate })));
      console.log(`📋 FINAL RESERVED ROOMS DATA (first 3):`, JSON.stringify(allReservedRooms.slice(0, 3), null, 2));
      console.log(`📋 FINAL RESERVED ROOMS DATA (all):`, JSON.stringify(allReservedRooms, null, 2));

      // Using all reserved rooms count (guest records + occupied rooms from Teable)
      const actualReservedCount = reservedRoomsDetails.length;
      const allReservedRoomsCount = allReservedRooms.length;
      console.log(`📊 Occupancy calculated from Teable Activity field: ${totalReserved} occupied rooms`);
      console.log(`📊 Actual guest records count: ${actualReservedCount}`);
      console.log(`📊 All reserved rooms count (including Teable): ${allReservedRoomsCount}`);
      console.log(`📊 Hostaway check-ins count (for reference): ${checkedInData.actualCheckedInCount}`);

      // Use the total count of all reserved rooms (not just guest records)
      totalReserved = allReservedRoomsCount;

      // Show all occupied rooms (with actual check-ins)
      console.log(`📋 LIST OF ALL ${reservedRoomsList.length} OCCUPIED ROOMS (WITH ACTUAL CHECK-INS):`);
      reservedRoomsList.forEach((room, index) => {
        console.log(`   ${index + 1}. ${room}`);
      });

      console.log(`\n=== OCCUPANCY CALCULATION SUMMARY ===`);
      console.log(`🏨 Total Rooms: ${totalRooms}`);
      console.log(`✅ Actual Checked-In Count: ${checkedInData.actualCheckedInCount}`);
      console.log(`📊 Occupancy Rate: ${totalRooms > 0 ? ((totalReserved / totalRooms) * 100).toFixed(2) : 0}% (${totalReserved}/${totalRooms})`);
      console.log(`🔍 Based on: Teable Activity field`);
      console.log(`=======================================`);

      // If no room inventory data from Teable, but we have reserved rooms from guest data, still return them
      if (totalRooms === 0 && allReservedRooms.length === 0) {
        console.log('⚠️ No room data found in Teable response and no guest records');
        return {
          reportDate: currentDate,
          reportTime: currentTime,
          occupancyRate: 0,
          totalRooms: 0,
          totalReserved: 0,
          totalAvailable: 0,
          roomTypes: {},
          reservedRooms: [],
          lastUpdated: new Date().toISOString(),
          error: 'No room data found in Teable API response'
        };
      }

      // If we have reserved rooms from guest data, use that count
      if (totalRooms === 0 && allReservedRooms.length > 0) {
        console.log(`✅ No Teable inventory data, but using ${allReservedRooms.length} guest records as reserved rooms`);
        totalReserved = allReservedRooms.length;
        // Don't set totalRooms yet - we'll calculate it below
      }

      // Calculate available rooms dynamically from room types (only if we have Teable data)
      let calculatedTotalAvailable = 0;
      if (totalRooms > 0) {
        // Calculate from room types breakdown
        calculatedTotalAvailable = Object.values(roomTypes).reduce((sum, data) => sum + data.available, 0);
        // Update totalRooms to include both reserved and available rooms
        totalRooms = totalReserved + calculatedTotalAvailable;
        console.log(`📊 Updated totalRooms to include available: ${totalRooms} (${totalReserved} reserved + ${calculatedTotalAvailable} available)`);
      } else if (totalReserved > 0) {
        // If we only have guest records (no Teable), don't set totalRooms
        // Keep it at 0 so frontend can calculate occupancy rate dynamically
        calculatedTotalAvailable = 0;
        console.log(`📊 No Teable data - using only guest records: ${totalReserved} reserved, 0 available (frontend will calculate)`);
      }

      // Calculate occupancy rate AFTER updating totalRooms
      // If totalRooms is 0 (no Teable data), set occupancy rate to 0 and let frontend calculate
      const occupancyRate = totalRooms > 0 ? ((totalReserved / totalRooms) * 100).toFixed(2) : 0;

      console.log(`📊 Final calculation: ${totalReserved} reserved / ${totalRooms} total (${calculatedTotalAvailable} available)`);
      const totalAvailable = calculatedTotalAvailable;

      return {
        reportDate: currentDate,
        reportTime: currentTime,
        occupancyRate: parseFloat(occupancyRate),
        totalRooms,
        totalReserved,
        totalAvailable: totalAvailable, // Dynamically calculated
        roomTypes: Object.entries(roomTypes)
          .filter(([_, data]) => data.total > 0)
          .reduce((acc, [type, data]) => {
            acc[type] = data;
            return acc;
          }, {}),
        reservedRooms: allReservedRooms, // Add detailed reserved rooms list (includes all occupied rooms)
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error processing occupancy data:', error);
      throw new Error('Failed to process occupancy data');
    }
  }

  /**
   * Generate formatted occupancy report
   */
  generateReport(data) {
    const { reportDate, reportTime, occupancyRate, totalReserved, totalRooms, roomTypes } = data;

    let report = `Daily Occupancy & Revenue Report (${reportDate})\n\n`;
    report += `🕒 Report Period: ${reportDate}, 12:00 AM - ${reportTime}\n`;
    report += `📈 Occupancy Rate: ${occupancyRate}% (Reserved: ${totalReserved} / Total: ${totalRooms})\n\n`;
    report += `🏨 Room Availability:\n`;

    Object.entries(roomTypes).forEach(([type, data]) => {
      report += `${type}: Available ${data.available} | Reserved ${data.reserved}\n\n`;
    });

    return report;
  }

  /**
   * Get current occupancy status
   */
  async getCurrentOccupancy() {
    try {
      const data = await this.fetchOccupancyData();

      // Fetch room types data from Room API
      let roomTypes = {};
      try {
        const fetch = require('node-fetch') || globalThis.fetch;
        const apiUrl = process.env.API_URL || 'http://localhost:5000';
        const roomTypesResponse = await fetch(`${apiUrl}/api/rooms/availability`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.HOSTAWAY_AUTH_TOKEN || ''}`
          },
          timeout: 30000
        });

        if (roomTypesResponse.ok) {
          const roomTypesData = await roomTypesResponse.json();
          if (roomTypesData.data && roomTypesData.data.roomTypes) {
            // Convert array to object format for frontend chart
            const roomTypesArray = roomTypesData.data.roomTypes;
            roomTypes = {};
            roomTypesArray.forEach(roomType => {
              roomTypes[roomType.roomType] = {
                available: roomType.available || 0,
                reserved: roomType.reserved || 0,
                blocked: roomType.blocked || 0,
                total: roomType.total || 0
              };
            });
            console.log('✅ Room types fetched and converted successfully:', Object.keys(roomTypes));
          }
        } else {
          console.warn('⚠️ Could not fetch room types:', roomTypesResponse.status);
        }
      } catch (err) {
        console.warn('⚠️ Error fetching room types:', err.message);
      }

      // Add roomTypes to the data
      data.roomTypes = roomTypes;

      return {
        success: true,
        data,
        report: this.generateReport(data)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get today's check-ins with detailed information - Dubai listings only
   */
  async getTodayCheckinsDetails() {
    try {
      console.log('🏨 Fetching detailed today\'s check-ins from DUBAI LISTINGS ONLY...');

      if (!this.hostawayAuthToken) {
        throw new Error('HOSTAWAY_AUTH_TOKEN not configured');
      }

      // Get current date in Dubai timezone (UTC+4)
      const now = new Date();
      const dubaiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
      const formattedToday = dubaiTime.getFullYear() + '-' +
        String(dubaiTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(dubaiTime.getDate()).padStart(2, '0');

      console.log(`📍 Dubai timezone date: ${formattedToday}`);

      // First, fetch all listings to identify Dubai properties
      console.log('🔍 Fetching all listings to identify Dubai properties...');
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
          console.warn('⚠️ Could not fetch listings, will use all reservations:', err.message);
          listingHasMore = false;
        }
      }

      // Filter for Dubai listings dynamically
      const dubaiListingIds = allListings
        .filter(listing => {
          const city = listing.city || listing.location || listing.address || '';
          const cityLower = city.toLowerCase();
          return cityLower.includes('dubai') || cityLower.includes('uae');
        })
        .map(listing => listing.id);

      console.log(`✅ Found ${dubaiListingIds.length} Dubai listings dynamically`);

      const baseReservationsUrl = 'https://api.hostaway.com/v1/reservations?includeResources=1';

      const response = await axios.get(baseReservationsUrl, {
        headers: {
          Authorization: this.hostawayAuthToken,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const allReservations = response.data.result || [];
      const todayCheckinsDetails = [];

      if (allReservations && allReservations.length > 0) {
        // Create a map of listing IDs to listing names for quick lookup
        const listingNameMap = new Map();
        allListings.forEach(listing => {
          // Priority: internalListingName > title > name > Unit ID
          const listingName = listing.internalListingName || listing.title || listing.name || `Unit ${listing.id}`;
          listingNameMap.set(listing.id, listingName);
          console.log(`📍 Listing ${listing.id}: internalName="${listing.internalListingName}", title="${listing.title}", name="${listing.name}" → Using: "${listingName}"`);
        });

        // Filter reservations: Dubai listings + within stay period
        const reservations = allReservations.filter(res => {
          if (!res.arrivalDate || !res.departureDate) return false;
          if (!['new', 'modified'].includes(res.status)) return false;

          // Only include Dubai listings
          if (!dubaiListingIds.includes(res.listingMapId)) return false;

          const arrival = new Date(res.arrivalDate);
          const departure = new Date(res.departureDate);
          const todayDate = new Date(formattedToday);

          // Include reservations where today is within the stay period
          const isWithinStayPeriod = (todayDate >= arrival && todayDate < departure);

          if (!isWithinStayPeriod) return false;

          // Check for test guests
          const guestName = res.guestName || res.firstName || res.lastName ||
            res.guest?.firstName || res.guest?.lastName ||
            res.guestFirstName || res.guestLastName || '';
          const isTestGuest = !guestName ||
            /test|testing|guests|new guest|test guest|new/i.test(guestName) ||
            (res.comment && /test|testing|new guest/i.test(res.comment)) ||
            (res.guestNote && /test|testing|new guest/i.test(res.guestNote));

          return !isTestGuest;
        });

        // Process each reservation to get detailed check-in information
        for (const res of reservations) {
          const arrival = new Date(res.arrivalDate);
          const departure = new Date(res.departureDate);
          const todayDate = new Date(formattedToday);

          // Process reservations where today is within the stay period (including staying guests)
          if (todayDate >= arrival && todayDate < departure) {
            // Determine if this is today's check-in or staying guest
            const isCheckInToday = arrival.toDateString() === todayDate.toDateString();
            const guestType = isCheckInToday ? 'Today\'s Check-in' : 'Staying Guest';

            // Get listing name from the map, fallback to Unit ID
            const listingName = listingNameMap.get(res.listingMapId) || `Unit ${res.listingMapId}`;

            todayCheckinsDetails.push({
              guestName: res.guestName || res.firstName || res.lastName || 'Unknown Guest',
              listingName: listingName,
              checkInDate: res.arrivalDate,
              guestType: guestType,
              reservationId: res.id,
              listingId: res.listingMapId
            });
          }
        }
      }

      console.log(`✅ Found ${todayCheckinsDetails.length} detailed reservations (check-ins + staying guests) for today`);
      console.log(`📋 Current occupancy details:`, todayCheckinsDetails);

      return {
        success: true,
        data: todayCheckinsDetails
      };

    } catch (error) {
      console.error('❌ Error fetching today\'s check-ins details:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get yesterday's and today's reservations for each listing
   * Returns data in format: { listingId: { yesterday: {...}, today: {...} } }
   */
  async getYesterdayTodayReservations() {
    try {
      console.log('📋 Fetching yesterday\'s and today\'s reservations for Dubai listings...');

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

      // Create a map of listing IDs to listing names
      const listingNameMap = new Map();
      allListings.forEach(listing => {
        const listingName = listing.internalListingName || listing.title || listing.name || `Unit ${listing.id}`;
        listingNameMap.set(listing.id, listingName);
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
          reservationsByListing[listingId] = {
            listingId: listingId,
            listingName: listingNameMap.get(listingId) || `Unit ${listingId}`,
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
          // Guest checked out yesterday
          reservationsByListing[listingId].yesterday = reservationData;
        } else if (isToday && !isYesterday) {
          // Guest checking in today (upcoming stay)
          reservationsByListing[listingId].today = reservationData;
        } else if (isYesterday && isToday) {
          // Staying guest - assign SAME data to both yesterday and today
          const stayingGuestData = {
            ...reservationData,
            status: 'Staying Guest'
          };
          reservationsByListing[listingId].yesterday = stayingGuestData;
          reservationsByListing[listingId].today = stayingGuestData;
        }
      }

      const result = Object.values(reservationsByListing);
      console.log(`✅ Organized ${result.length} listings with yesterday/today reservations`);

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Error fetching yesterday/today reservations:', error.message);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

module.exports = new OccupancyService();
