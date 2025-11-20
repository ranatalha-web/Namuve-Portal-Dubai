const axios = require('axios');
const config = require('../src/config/config');

// Dynamic Dubai listings data - will be fetched from API
let DUBAI_LISTINGS_DATA = {};

// Simple in-memory lock to prevent concurrent API calls
let isProcessing = false;
let lastProcessTime = 0;
const PROCESS_COOLDOWN = 30000; // 30 seconds cooldown between requests

/**
 * Fetch detailed listing information including Airbnb summary
 * @param {number} listingId - The listing ID
 * @returns {Promise<Object>} Detailed listing data
 */
async function fetchListingDetails(listingId) {
  const authToken = config.HOSTAWAY_AUTH_TOKEN;
  
  try {
    const response = await axios.get(`https://api.hostaway.com/v1/listings/${listingId}`, {
      headers: {
        'Authorization': authToken,
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
 * Extract bedroom count from Airbnb summary or listing details
 * @param {Object} listingDetails - Detailed listing data
 * @returns {string} Category (Studio, 1BR, 2BR)
 */
function categorizeDynamically(listingDetails, listingName) {
  // Check Airbnb summary first
  if (listingDetails?.airbnbSummary) {
    const summary = listingDetails.airbnbSummary.toLowerCase();
    
    // Extract bedroom count from summary
    if (summary.includes('studio') || summary.includes('0 bedroom')) {
      return 'Studio';
    } else if (summary.includes('1 bedroom') || summary.includes('1-bedroom')) {
      return '1BR';
    } else if (summary.includes('2 bedroom') || summary.includes('2-bedroom')) {
      return '2BR';
    }
  }

  // Check accommodates field for guest capacity
  if (listingDetails?.accommodates) {
    const accommodates = parseInt(listingDetails.accommodates);
    if (accommodates <= 2) {
      return 'Studio';
    } else if (accommodates <= 4) {
      return '1BR';
    } else {
      return '2BR';
    }
  }

  // Check bedrooms field if available
  if (listingDetails?.bedrooms) {
    const bedrooms = parseInt(listingDetails.bedrooms);
    if (bedrooms === 0) {
      return 'Studio';
    } else if (bedrooms === 1) {
      return '1BR';
    } else {
      return '2BR';
    }
  }

  // Fallback to name-based categorization
  const name = listingName.toLowerCase();
  if (name.includes('studio')) {
    return 'Studio';
  } else if (name.includes('1br') || name.includes('1 br') || name.includes('1 bedroom')) {
    return '1BR';
  } else if (name.includes('2br') || name.includes('2 br') || name.includes('2 bedroom')) {
    return '2BR';
  }

  // Default to 2BR for Dubai luxury properties
  return '2BR';
}

/**
 * Fetch Dubai listings from Hostaway API and categorize them dynamically
 * @returns {Promise<Object>} Categorized Dubai listings data
 */
async function fetchDubaiListingsData() {
  const authToken = config.HOSTAWAY_AUTH_TOKEN;
  
  try {
    console.log('🏠 Fetching Dubai listings from Hostaway API...');
    console.log('🔑 Using auth token:', authToken ? 'Token present' : 'No token');
    
    const response = await axios.get('https://api.hostaway.com/v1/listings?limit=200', {
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.data || !response.data.result) {
      throw new Error('Invalid response from listings API');
    }

    const listings = response.data.result;
    const categorizedListings = {};
    let totalDubaiCount = 0;
    let categorizedCount = 0;
    let otherCount = 0;

    console.log('\n========================================');
    console.log('🏙️  DUBAI LISTING REVENUE CATEGORIZATION');
    console.log('========================================');
    console.log(`📊 Total listings from Hostaway API: ${listings.length}`);

    // Process each listing and categorize dynamically
    for (const listing of listings) {
      if (!listing.id || !listing.name) {
        console.log(`⚠️ Skipping listing with missing ID or name: ID=${listing.id}, Name="${listing.name}"`);
        continue;
      }

      // Filter only Dubai/UAE listings
      const isDubaiListing = (
        listing.country === 'United Arab Emirates' || 
        listing.city?.toLowerCase().includes('dubai') ||
        listing.name.toLowerCase().includes('dubai')
      );

      if (!isDubaiListing) {
        otherCount++;
        continue;
      }

      totalDubaiCount++;
      console.log(`✅ DUBAI LISTING #${totalDubaiCount}: ${listing.name}`);

      // Fetch detailed listing information for dynamic categorization
      console.log(`🔍 Fetching details for listing ${listing.id}...`);
      const listingDetails = await fetchListingDetails(listing.id);
      
      // Use dynamic categorization based on Airbnb summary and listing details
      const category = categorizeDynamically(listingDetails, listing.name);
      
      console.log(`📊 Dynamic categorization result: ${category}`);
      if (listingDetails?.airbnbSummary) {
        console.log(`📝 Airbnb Summary: ${listingDetails.airbnbSummary.substring(0, 100)}...`);
      }
      if (listingDetails?.bedrooms) {
        console.log(`🛏️ Bedrooms: ${listingDetails.bedrooms}`);
      }
      if (listingDetails?.accommodates) {
        console.log(`👥 Accommodates: ${listingDetails.accommodates}`);
      }

      console.log(`   → Categorized as: ${category}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

      categorizedCount++;
      // Initialize category array if it doesn't exist
      if (!categorizedListings[category]) {
        categorizedListings[category] = [];
      }

      // Add listing with full details to the appropriate category
      categorizedListings[category].push({
        id: listing.id,
        name: listing.name,
        city: listing.city,
        country: listing.country,
        currency: listing.currency || 'AED'
      });
    }

    console.log('\n========================================');
    console.log('📊 DUBAI LISTING CATEGORIZATION SUMMARY');
    console.log('========================================');
    console.log(`✅ Dubai listings (included): ${totalDubaiCount}`);
    console.log(`⏭️ Other locations (excluded): ${otherCount}`);
    console.log(`📦 Total processed: ${listings.length}`);
    
    console.log('\n📋 DUBAI REVENUE CATEGORIES:');
    Object.keys(categorizedListings).forEach(category => {
      const listings = categorizedListings[category];
      console.log(`   ${category}: ${listings.length} listings`);
    });
    console.log('========================================\n');

    return categorizedListings;

  } catch (error) {
    console.error('❌ Error fetching Dubai listings:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response data:', error.response.data);
      
      if (error.response.status === 403) {
        console.error('🔒 Authorization failed - check your HOSTAWAY_AUTH_TOKEN');
        console.error('💡 Make sure the token has permission to access listings');
      }
    }
    
    // No fallback - return empty data if API fails
    console.log('❌ API failed - returning empty Dubai listings data');
    return {};
  }
}

/**
 * Refresh Dubai listings data (no cache)
 * @returns {Promise<Object>} Fresh Dubai listings data
 */
async function refreshDubaiListingsCache() {
  console.log('🔄 Refreshing Dubai listings data...');
  const freshListings = await fetchDubaiListingsData();
  DUBAI_LISTINGS_DATA = freshListings;
  
  return freshListings;
}

/**
 * Get Dubai revenue and occupancy data with listing categorization
 * @returns {Promise<Object>} Dubai revenue data by category
 */
async function getDubaiRevenueAndOccupancy() {
  const authToken = config.HOSTAWAY_AUTH_TOKEN;

  // Always fetch fresh Dubai listings data dynamically
  console.log('🔄 Fetching fresh Dubai listings data from API...');
  DUBAI_LISTINGS_DATA = await fetchDubaiListingsData();
  
  if (!DUBAI_LISTINGS_DATA || Object.keys(DUBAI_LISTINGS_DATA).length === 0) {
    console.log('❌ No Dubai listings data available - cannot proceed');
    throw new Error('No Dubai listings data available from API');
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Initialize revenue tracking
  let totalRevenue = 0;
  let actualRevenue = 0;
  let expectedRevenue = 0;
  let occupancyRate = 0;
  let totalRooms = 0;
  let occupiedRooms = 0;
  
  // Initialize category-wise revenue tracking
  let categoryRevenue = {
    'Studio': 0,
    '1BR': 0,
    '2BR': 0
  };

  // Initialize category availability tracking
  let categoryAvailability = {};
  Object.keys(DUBAI_LISTINGS_DATA).forEach(category => {
    categoryAvailability[category] = { 
      available: 0, 
      reserved: 0,
      total: DUBAI_LISTINGS_DATA[category].length
    };
    totalRooms += DUBAI_LISTINGS_DATA[category].length;
  });

  try {
    console.log('\n========================================');
    console.log('🏨 DUBAI RESERVATIONS PROCESSING');
    console.log('========================================');

    // Create a flat array of all Dubai listing IDs
    const dubaiListingIds = Object.values(DUBAI_LISTINGS_DATA)
      .flat()
      .map(listing => listing.id);

    console.log(`📋 Processing ${dubaiListingIds.length} Dubai listings for reservations...`);
    
    // Log all Dubai listings for debugging
    console.log(`\n🏢 DUBAI LISTINGS IN DATABASE:`);
    Object.entries(DUBAI_LISTINGS_DATA).forEach(([category, listings]) => {
      console.log(`\n${category}:`);
      listings.forEach((listing, index) => {
        console.log(`   ${index + 1}. ID: ${listing.id}, Name: ${listing.name}`);
      });
    });
    
    // Show total Dubai listings count by category
    console.log(`\n📊 Dubai Listings Summary:`);
    Object.entries(DUBAI_LISTINGS_DATA).forEach(([category, listings]) => {
      console.log(`   ${category}: ${listings.length} listings`);
    });

    // Fetch all reservations and filter for Dubai listings
    let dubaiReservationsCount = 0;
    let processedReservations = 0;
    let activeStayReservations = []; // Array to collect all active stays
    let allReservations = []; // Declare allReservations in outer scope
    
    // Counters for filtering analysis
    let filteredByStatus = 0;
    let filteredByLocation = 0;
    let filteredByStayStatus = 0;
    
    console.log(`🔍 Fetching all reservations for today...`);
    
    // Fetch reservations for a much broader date range to catch all reservations
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Look back 90 days to catch all ongoing reservations
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90); // Look ahead 90 days for future reservations
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Searching reservations from ${startDateStr} to ${endDateStr}`);
    
    // Use multiple API calls to catch all reservations:
    // 1. Reservations by arrival date
    const arrivalUrl = `https://api.hostaway.com/v1/reservations?arrivalStartDate=${startDateStr}&arrivalEndDate=${endDateStr}&includeFinanceFields=1&limit=500`;
    // 2. Reservations by departure date (to catch ongoing stays)
    const departureUrl = `https://api.hostaway.com/v1/reservations?departureStartDate=${startDateStr}&departureEndDate=${endDateStr}&includeFinanceFields=1&limit=500`;
    // 3. Get all reservations without date filter (last 6 months)
    const allReservationsUrl = `https://api.hostaway.com/v1/reservations?includeFinanceFields=1&limit=1000`;
    
    try {
      // Make three API calls to get comprehensive reservation data
      console.log(`🔍 Fetching reservations by arrival date...`);
      const arrivalResponse = await axios.get(arrivalUrl, {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`🔍 Fetching reservations by departure date...`);
      const departureResponse = await axios.get(departureUrl, {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`🔍 Fetching all recent reservations...`);
      const allRecentResponse = await axios.get(allReservationsUrl, {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Combine and deduplicate reservations from all three sources
      const arrivalReservations = arrivalResponse.data?.result || [];
      const departureReservations = departureResponse.data?.result || [];
      const allRecentReservations = allRecentResponse.data?.result || [];
      
      // Use Map to deduplicate by reservation ID
      const reservationMap = new Map();
      
      [...arrivalReservations, ...departureReservations, ...allRecentReservations].forEach(reservation => {
        reservationMap.set(reservation.id, reservation);
      });
      
      allReservations = Array.from(reservationMap.values());
      console.log(`📊 Total unique reservations from API: ${allReservations.length}`);
      console.log(`📊 Sources - Arrival: ${arrivalReservations.length}, Departure: ${departureReservations.length}, Recent: ${allRecentReservations.length}`);
      
      // Log all reservations for debugging
      console.log(`\n🔍 ANALYZING ALL ${allReservations.length} RESERVATIONS:`);
      
      
      allReservations.forEach((res, index) => {
        console.log(`${index + 1}. Reservation ID: ${res.id}, Listing: ${res.listingMapId}, Status: ${res.status}, Arrival: ${res.arrivalDate}, Departure: ${res.departureDate}, Guest: ${res.guestName || 'Unknown'}`);
      });

      // Dynamic analysis of all reservations
      console.log(`\n🔍 DYNAMIC RESERVATION ANALYSIS:`);
      
      // Search for current month reservations
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      console.log(`\n🔍 SEARCHING FOR CURRENT MONTH (${currentMonth}) RESERVATIONS:`);
      const currentMonthReservations = allReservations.filter(res => 
        (res.arrivalDate && res.arrivalDate.startsWith(currentMonth)) ||
        (res.departureDate && res.departureDate.startsWith(currentMonth))
      );
      
      console.log(`📅 Found ${currentMonthReservations.length} current month reservations:`);
      currentMonthReservations.forEach((res, index) => {
        console.log(`   ${index + 1}. ID: ${res.id}, Guest: ${res.guestName || 'Unknown'}, Listing: ${res.listingMapId}`);
        console.log(`      Status: ${res.status}, Arrival: ${res.arrivalDate}, Departure: ${res.departureDate}`);
      });
      
      // Search for long-term stays (30+ days)
      console.log(`\n🔍 SEARCHING FOR LONG-TERM STAYS (30+ DAYS):`);
      const longTermStays = allReservations.filter(res => {
        if (res.arrivalDate && res.departureDate) {
          const arrival = new Date(res.arrivalDate);
          const departure = new Date(res.departureDate);
          const daysDiff = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24));
          return daysDiff >= 30;
        }
        return false;
      });
      
      console.log(`🏨 Found ${longTermStays.length} long-term stays (30+ days):`);
      longTermStays.forEach((res, index) => {
        const arrival = new Date(res.arrivalDate);
        const departure = new Date(res.departureDate);
        const days = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24));
        console.log(`   ${index + 1}. ID: ${res.id}, Guest: ${res.guestName || 'Unknown'}, Days: ${days}`);
        console.log(`      Listing: ${res.listingMapId}, Status: ${res.status}`);
        console.log(`      Arrival: ${res.arrivalDate}, Departure: ${res.departureDate}`);
      });

        // First, let's check each Dubai listing to see if it has reservations
        console.log(`\n🏢 CHECKING EACH DUBAI APARTMENT FOR RESERVATIONS:`);
        console.log(`========================================`);
        
        Object.entries(DUBAI_LISTINGS_DATA).forEach(([category, listings]) => {
          console.log(`\n📂 ${category} APARTMENTS:`);
          listings.forEach((listing, index) => {
            const listingReservations = allReservations.filter(res => 
              Number(res.listingMapId) === listing.id
            );
            
            console.log(`\n${index + 1}. 🏢 ${listing.name}`);
            console.log(`   🆔 Listing ID: ${listing.id}`);
            console.log(`   📊 Reservations Found: ${listingReservations.length}`);
            
            if (listingReservations.length > 0) {
              listingReservations.forEach((res, resIndex) => {
                console.log(`      ${resIndex + 1}. Reservation ID: ${res.id}`);
                console.log(`         👤 Guest: ${res.guestName || 'Unknown'}`);
                console.log(`         📅 Dates: ${res.arrivalDate} to ${res.departureDate}`);
                console.log(`         📊 Status: ${res.status}`);
              });
            } else {
              console.log(`      ❌ No reservations found for this apartment`);
            }
          });
        });
        
        console.log(`\n========================================`);
        console.log(`🔍 NOW PROCESSING ALL RESERVATIONS:`);
        console.log(`========================================`);

        // Process each reservation and check if it's for a Dubai listing
        for (const reservation of allReservations) {
          const listingId = Number(reservation.listingMapId);
          
          // Check reservation status - only process "new" or "modified" reservations
          const reservationStatus = reservation.status?.toLowerCase();
          const allowedStatuses = ['new', 'modified'];
          
          if (!allowedStatuses.includes(reservationStatus)) {
            console.log(`❌ FILTERED OUT - Status: Reservation ${reservation.id} with status: ${reservation.status} (Not new or modified)`);
            filteredByStatus++;
            continue; // Skip non-new/modified reservations
          }
          
          console.log(`\n🔍 STEP 1 - Status Check PASSED: Reservation ${reservation.id} with status: ${reservation.status}`);
          
          // Check if this reservation is for a Dubai listing
          let isDubaiReservation = false;
          let listingCategory = 'Unknown';
          let listingName = 'Unknown';
          
          for (const [category, listings] of Object.entries(DUBAI_LISTINGS_DATA)) {
            const found = listings.find(listing => listing.id === listingId);
            if (found) {
              isDubaiReservation = true;
              listingCategory = category;
              listingName = found.name;
              break;
            }
          }

          if (!isDubaiReservation) {
            console.log(`❌ FILTERED OUT - Location: Reservation ${reservation.id} for listing ${listingId} (Not Dubai)`);
            filteredByLocation++;
            continue; // Skip non-Dubai reservations
          }
          
          console.log(`✅ STEP 2 - Dubai Check PASSED: Reservation ${reservation.id} for ${listingName} (${listingCategory})`)

          // Check if guest is currently staying (checked in but not checked out)
          // Also include reservations where departure date matches today
          const today = new Date().toISOString().split('T')[0];
          const arrivalDate = reservation.arrivalDate;
          const departureDate = reservation.departureDate;
          
          const isCurrentlyStaying = arrivalDate <= today && departureDate >= today;
          
          // Check if currently staying (including checkout day)
          if (!isCurrentlyStaying) {
            console.log(`⚠️ NOT CURRENTLY STAYING - Reservation ${reservation.id}`);
            console.log(`   📅 Arrival: ${arrivalDate}, Departure: ${departureDate}, Today: ${today}`);
            console.log(`   🔍 Check: ${arrivalDate} <= ${today} = ${arrivalDate <= today}, ${departureDate} >= ${today} = ${departureDate >= today}`);
            // Don't skip - continue processing to show all Dubai reservations
          } else {
            console.log(`✅ STEP 3 - Active Stay Check PASSED: Reservation ${reservation.id} - Guest IS currently staying (including checkout day)`);
            console.log(`   📅 Arrival: ${arrivalDate}, Departure: ${departureDate}, Today: ${today}`);
          }

          console.log(`🏆 FINAL RESULT: Dubai reservation for listing ${listingId} (${listingName}) - Status: ${reservation.status}`);

          // Extract revenue from finance fields
          let revenueValue = 0;
          
          if (reservation.financeField && Array.isArray(reservation.financeField)) {
            const baseRateField = reservation.financeField.find(field => 
              field.fieldName === 'baseRate' || field.fieldName === 'base_rate'
            );
            
            if (baseRateField && baseRateField.value) {
              revenueValue = parseFloat(baseRateField.value) || 0;
            }
          }

          // If no base rate found, try total price as fallback
          if (revenueValue === 0 && reservation.totalPrice) {
            const nights = reservation.nights || 1;
            revenueValue = parseFloat(reservation.totalPrice) / nights;
          }

          // Determine reservation status based on current stay
          // Include reservations that are currently staying (including checkout day)
          const isActiveReservation = isCurrentlyStaying && 
                                    reservation.guestName && 
                                    reservation.guestName !== 'Test Guest' && 
                                    !['cancelled', 'expired', 'inquiry', 'declined', 'rejected'].includes(reservation.status?.toLowerCase());
          
          // Log the check for debugging
          if (departureDate === today) {
            console.log(`🔍 CHECKOUT DAY CHECK - Reservation ${reservation.id}:`);
            console.log(`   Departure: ${departureDate}, Today: ${today}, Match: ${departureDate === today}`);
            console.log(`   isCurrentlyStaying: ${isCurrentlyStaying}`);
            console.log(`   isActiveReservation: ${isActiveReservation}`);
          }

          // Add to appropriate revenue category
          if (isActiveReservation) {
            actualRevenue += revenueValue;
            occupiedRooms++;
            console.log(`💰 Added ${revenueValue.toFixed(2)} AED to ACTUAL revenue (Currently Staying)`);
          } else {
            expectedRevenue += revenueValue;
            console.log(`💰 Added ${revenueValue.toFixed(2)} AED to EXPECTED revenue (Past/Future/Inactive)`);
          }

          // Track category-wise revenue
          if (categoryRevenue[listingCategory] !== undefined) {
            categoryRevenue[listingCategory] += revenueValue;
            console.log(`💰 Added ${revenueValue.toFixed(2)} AED to ${listingCategory} category`);
          }

          // Update availability based on current stay status
          if (categoryAvailability[listingCategory]) {
            if (isActiveReservation) {
              categoryAvailability[listingCategory].reserved++;
              console.log(`🏨 Marked ${listingCategory} apartment as RESERVED (Currently Staying)`);
            } else {
              categoryAvailability[listingCategory].available++;
              console.log(`🏨 Marked ${listingCategory} apartment as AVAILABLE (Not Currently Staying)`);
            }
          }

          // Log detailed reservation information
          const stayStatus = isCurrentlyStaying ? "YES (Currently Staying)" : "NO (Past/Future Stay)";
          console.log(`\n📋 DUBAI RESERVATION DETAILS:`);
          console.log(`   Reservation ID: ${reservation.id}`);
          console.log(`   Status: ${reservation.status}`);
          console.log(`   Guest Name: ${reservation.guestName || 'Unknown'}`);
          console.log(`   Listing Name: ${listingName}`);
          console.log(`   Base Rate: ${revenueValue.toFixed(2)} AED`);
          console.log(`   Nights: ${reservation.nights || 1}`);
          console.log(`   Total Price: ${reservation.totalPrice || 'N/A'} AED`);
          console.log(`   Category: ${listingCategory}`);
          console.log(`   Check-in: ${reservation.arrivalDate}`);
          console.log(`   Check-out: ${reservation.departureDate}`);
          console.log(`   🏨 Currently Staying: ${stayStatus}`);
          
          // Collect this active stay for combined display
          activeStayReservations.push({
            id: reservation.id,
            status: reservation.status,
            guestName: reservation.guestName || 'Unknown',
            listingName: listingName,
            listingCategory: listingCategory,
            baseRate: revenueValue.toFixed(2),
            nights: reservation.nights || 1,
            totalPrice: reservation.totalPrice || 'N/A',
            arrivalDate: reservation.arrivalDate,
            departureDate: reservation.departureDate,
            revenue: revenueValue
          });
          
          dubaiReservationsCount++;
          processedReservations++;
        }
    } catch (error) {
      console.log(`⚠️ Error fetching reservations: ${error.message}`);
    }

    console.log(`\n========================================`);
    console.log(`🎯 FINAL FILTERING RESULTS`);
    console.log(`========================================`);
    console.log(`📊 Total reservations from API: ${allReservations ? allReservations.length : 'N/A'}`);
    console.log(`✅ Dubai reservations found: ${dubaiReservationsCount} (All Dubai reservations - active and inactive)`);
    console.log(`📋 Total Dubai listings processed: ${dubaiListingIds.length}`);
    console.log(`🔍 Reservations processed: ${processedReservations}`);
    
    console.log(`\n📊 FILTERING BREAKDOWN:`);
    console.log(`   ❌ Filtered by Status (inactive): ${filteredByStatus}`);
    console.log(`   ❌ Filtered by Location (non-Dubai): ${filteredByLocation}`);
    console.log(`   ❌ Filtered by Stay Status (not currently staying): ${filteredByStayStatus}`);
    console.log(`   ✅ Passed all filters: ${dubaiReservationsCount}`);
    console.log(`   📊 Total processed: ${filteredByStatus + filteredByLocation + filteredByStayStatus + dubaiReservationsCount}`);
    
    // Summary of which apartments have reservations
    console.log(`\n🏢 APARTMENT RESERVATION SUMMARY:`);
    console.log(`========================================`);
    let apartmentsWithReservations = 0;
    let apartmentsWithoutReservations = 0;
    
    Object.entries(DUBAI_LISTINGS_DATA).forEach(([category, listings]) => {
      console.log(`\n📂 ${category}:`);
      listings.forEach((listing) => {
        const hasReservations = allReservations.some(res => 
          Number(res.listingMapId) === listing.id &&
          !['cancelled', 'expired', 'inquiry', 'declined', 'rejected'].includes(res.status?.toLowerCase())
        );
        
        if (hasReservations) {
          console.log(`   ✅ ${listing.name} (ID: ${listing.id}) - HAS RESERVATIONS`);
          apartmentsWithReservations++;
        } else {
          console.log(`   ❌ ${listing.name} (ID: ${listing.id}) - NO RESERVATIONS`);
          apartmentsWithoutReservations++;
        }
      });
    });
    
    console.log(`\n📊 FINAL APARTMENT SUMMARY:`);
    console.log(`   ✅ Apartments with reservations: ${apartmentsWithReservations}`);
    console.log(`   ❌ Apartments without reservations: ${apartmentsWithoutReservations}`);
    console.log(`   🏢 Total Dubai apartments: ${apartmentsWithReservations + apartmentsWithoutReservations}`);
    
    // Show availability breakdown by category
    console.log(`\n🏨 AVAILABILITY BREAKDOWN BY CATEGORY:`);
    console.log(`========================================`);
    Object.entries(categoryAvailability).forEach(([category, counts]) => {
      const total = counts.available + counts.reserved;
      console.log(`📂 ${category}:`);
      console.log(`   🟢 Available: ${counts.available}`);
      console.log(`   🔴 Reserved (Currently Staying): ${counts.reserved}`);
      console.log(`   📊 Total: ${total}`);
      console.log(`   📈 Occupancy: ${total > 0 ? ((counts.reserved / total) * 100).toFixed(1) : '0.0'}%`);
    });
    
    if (dubaiReservationsCount < 7) {
      console.log(`\n⚠️  ANALYSIS: Expected 7 but found ${dubaiReservationsCount}`);
      console.log(`   Possible reasons:`);
      console.log(`   1. Some reservations have inactive status (cancelled, expired, etc.)`);
      console.log(`   2. Some reservations are for non-Dubai properties`);
      console.log(`   3. Some guests have already checked out or not yet checked in`);
      console.log(`   4. Date range might not capture all reservations`);
      console.log(`   📝 Check the detailed logs above for specific filtering reasons`);
    }

    // Display combined Dubai reservations summary
    console.log(`\n========================================`);
    console.log(`🏨 COMBINED DUBAI RESERVATIONS SUMMARY`);
    console.log(`========================================`);
    console.log(`📊 Total Dubai Reservations: ${activeStayReservations.length}`);
    
    if (activeStayReservations.length > 0) {
      console.log(`\n🎯 ALL DUBAI RESERVATIONS (ACTIVE AND INACTIVE):`);
      
      activeStayReservations.forEach((stay, index) => {
        const today = new Date().toISOString().split('T')[0];
        const isCurrentlyStaying = stay.arrivalDate <= today && stay.departureDate > today;
        const stayStatus = isCurrentlyStaying ? "YES (Currently Staying)" : "NO (Past/Future Stay)";
        
        console.log(`\n${index + 1}. 🏨 DUBAI GUEST #${stay.id}`);
        console.log(`   👤 Guest: ${stay.guestName}`);
        console.log(`   🏢 Property: ${stay.listingName} (${stay.listingCategory})`);
        console.log(`   💰 Base Rate: ${stay.baseRate} AED`);
        console.log(`   🌙 Nights: ${stay.nights}`);
        console.log(`   💵 Total: ${stay.totalPrice} AED`);
        console.log(`   📅 Check-in: ${stay.arrivalDate}`);
        console.log(`   📅 Check-out: ${stay.departureDate}`);
        console.log(`   📊 Status: ${stay.status}`);
        console.log(`   🏨 Currently Staying: ${stayStatus}`);
      });
      
      // Calculate combined totals
      const totalActiveRevenue = activeStayReservations.reduce((sum, stay) => sum + stay.revenue, 0);
      const totalActiveNights = activeStayReservations.reduce((sum, stay) => sum + stay.nights, 0);
      
      console.log(`\n💰 COMBINED DUBAI RESERVATIONS TOTALS:`);
      console.log(`   🏨 Total Dubai Reservations: ${activeStayReservations.length}`);
      console.log(`   💵 Total Revenue: ${totalActiveRevenue.toFixed(2)} AED`);
      console.log(`   🌙 Total Nights: ${totalActiveNights}`);
      console.log(`   📊 Average Rate per Night: ${totalActiveNights > 0 ? (totalActiveRevenue / totalActiveNights).toFixed(2) : '0.00'} AED`);
      
      // Count currently staying vs past/future
      const currentlyStaying = activeStayReservations.filter(stay => {
        const today = new Date().toISOString().split('T')[0];
        return stay.arrivalDate <= today && stay.departureDate > today;
      }).length;
      
      console.log(`\n📊 STAY STATUS BREAKDOWN:`);
      console.log(`   🏨 Currently Staying: ${currentlyStaying}`);
      console.log(`   📅 Past/Future Stays: ${activeStayReservations.length - currentlyStaying}`);
      
    } else {
      console.log(`\n❌ No Dubai reservations found`);
    }

    // Calculate totals
    totalRevenue = actualRevenue + expectedRevenue;
    occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Create final apartment status summary
    console.log(`\n🏢 FINAL APARTMENT STATUS SUMMARY`);
    console.log(`========================================`);
    
    const currentlyStayingListings = new Set();
    // First, identify which listings have currently staying guests
    console.log(`\n🔍 IDENTIFYING RESERVED APARTMENTS:`);
    console.log(`🔍 Debug - allReservations length: ${allReservations ? allReservations.length : 'undefined'}`);
    console.log(`🔍 Debug - allReservations type: ${typeof allReservations}`);
      
    if (!allReservations || allReservations.length === 0) {
      console.log(`❌ ERROR: allReservations is empty or undefined!`);
      return;
    }
    
    allReservations.forEach(reservation => {
      const listingId = Number(reservation.listingMapId);
      const today = new Date().toISOString().split('T')[0];
      const isCurrentlyStaying = reservation.arrivalDate <= today && reservation.departureDate > today;
      const isActiveReservation = isCurrentlyStaying && 
                                reservation.guestName && 
                                reservation.guestName !== 'Test Guest' && 
                                !['cancelled', 'expired', 'inquiry', 'declined', 'rejected'].includes(reservation.status?.toLowerCase());
      
      console.log(`   Reservation ${reservation.id}: Listing ${listingId}, Guest: ${reservation.guestName}`);
      console.log(`      Dates: ${reservation.arrivalDate} to ${reservation.departureDate}, Today: ${today}`);
      console.log(`      Currently Staying: ${isCurrentlyStaying}, Active: ${isActiveReservation}, Status: ${reservation.status}`);
      
      if (isActiveReservation) {
        currentlyStayingListings.add(listingId);
        console.log(`      ✅ MARKED AS RESERVED: Listing ${listingId}`);
      } else {
        console.log(`      ❌ Not reserved: ${!isCurrentlyStaying ? 'Not currently staying' : 'Inactive reservation'}`);
      }
    });
    
    console.log(`\n📊 RESERVED LISTINGS SET: ${Array.from(currentlyStayingListings).join(', ')}`);
    console.log(`📊 Total Reserved Listings: ${currentlyStayingListings.size}`);
    
    // Show each apartment status
    Object.entries(DUBAI_LISTINGS_DATA).forEach(([category, listings]) => {
      console.log(`\n📂 ${category} APARTMENTS:`);
      listings.forEach((listing, index) => {
        const isReserved = currentlyStayingListings.has(listing.id);
        const status = isReserved ? "🔴 RESERVED" : "🟢 AVAILABLE";
        console.log(`   ${index + 1}. ${listing.name} - ${status} (ID: ${listing.id}, In Set: ${isReserved})`);
      });
    });
    
    // Count actual reserved vs available apartments
    let reservedCount = 0;
    let availableCount = 0;
    const totalApartments = Object.values(DUBAI_LISTINGS_DATA).flat().length;
    
    Object.values(DUBAI_LISTINGS_DATA).flat().forEach(listing => {
      if (currentlyStayingListings.has(listing.id)) {
        reservedCount++;
      } else {
        availableCount++;
      }
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   🔴 Reserved Apartments: ${reservedCount}`);
    console.log(`   🟢 Available Apartments: ${availableCount}`);
    console.log(`   🏢 Total Dubai Apartments: ${totalApartments}`);
    console.log(`   🔍 Debug - Reserved Set Size: ${currentlyStayingListings.size}`);
    console.log(`   🔍 Debug - Reserved + Available: ${reservedCount + availableCount}`);

    // Final detailed reservation summary
    console.log('\n========================================');
    console.log('📋 FINAL RESERVATION DETAILS SUMMARY');
    console.log('========================================');
    
    if (activeStayReservations.length > 0) {
      // Filter to show only currently staying guests (including checkout day)
      const today = new Date().toISOString().split('T')[0];
      const currentlyStayingReservations = activeStayReservations.filter(reservation => {
        return reservation.arrivalDate <= today && reservation.departureDate >= today;
      });
      
      console.log(`\n📊 SHOWING ONLY CURRENTLY STAYING GUESTS (${currentlyStayingReservations.length} out of ${activeStayReservations.length} total):\n`);
      
      if (currentlyStayingReservations.length > 0) {
        currentlyStayingReservations.forEach((reservation, index) => {
          console.log(`${index + 1}. 📋 RESERVATION DETAILS:`);
          console.log(`   🆔 Reservation ID: ${reservation.id}`);
          console.log(`   👤 Guest Name: ${reservation.guestName}`);
          console.log(`   🏢 Listing Name: ${reservation.listingName}`);
          console.log(`   📂 Listing Category: ${reservation.listingCategory}`);
          console.log(`   💰 Base Rate: ${reservation.baseRate} AED`);
          console.log(`   💵 Total Price: ${reservation.totalPrice} AED`);
          console.log(`   📅 Arrival Date: ${reservation.arrivalDate}`);
          console.log(`   📅 Departure Date: ${reservation.departureDate}`);
          console.log(`   📊 Status: ${reservation.status}`);
          console.log(`   🏨 Currently Staying: YES ✅`);
          console.log('   ────────────────────────────────────────');
        });
      } else {
        console.log(`   ❌ No guests are currently staying in Dubai properties`);
      }
      
      // Summary by category (only currently staying)
      console.log(`\n📊 CURRENTLY STAYING GUESTS BY CATEGORY:`);
      const categoryCount = {};
      const categoryBaseRateTotal = {};
      
      currentlyStayingReservations.forEach(res => {
        const category = res.listingCategory;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        categoryBaseRateTotal[category] = (categoryBaseRateTotal[category] || 0) + parseFloat(res.baseRate || 0);
      });
      
      if (Object.keys(categoryCount).length > 0) {
        Object.entries(categoryCount).forEach(([category, count]) => {
          const totalBaseRate = categoryBaseRateTotal[category] || 0;
          console.log(`   📂 ${category}: ${count} currently staying`);
          console.log(`      💰 Total Base Rate: ${totalBaseRate.toFixed(2)} AED`);
        });
        
        // Grand total base rates
        const grandTotalBaseRate = Object.values(categoryBaseRateTotal).reduce((sum, rate) => sum + rate, 0);
        console.log(`\n💰 GRAND TOTAL BASE RATES (Currently Staying):`);
        console.log(`   🏆 Total Base Rate All Categories: ${grandTotalBaseRate.toFixed(2)} AED`);
        
      } else {
        console.log(`   ❌ No guests currently staying by category`);
      }
      
    } else {
      console.log(`\n❌ No Dubai reservations found`);
    }

    // Update categoryRevenue with Total Base Rate values for API response
    console.log(`\n🔄 UPDATING CATEGORY REVENUE WITH TOTAL BASE RATES:`);
    if (activeStayReservations.length > 0) {
      // Reset categoryRevenue to use Total Base Rate values
      categoryRevenue = {
        'Studio': 0,
        '1BR': 0,
        '2BR': 0
      };
      
      // Filter to currently staying guests and calculate Total Base Rate by category
      // Include reservations where departure date matches today (checkout day)
      const today = new Date().toISOString().split('T')[0];
      const currentlyStayingReservations = activeStayReservations.filter(reservation => {
        return reservation.arrivalDate <= today && reservation.departureDate >= today;
      });
      
      currentlyStayingReservations.forEach(res => {
        const category = res.listingCategory;
        const baseRate = parseFloat(res.baseRate || 0);
        if (categoryRevenue[category] !== undefined) {
          categoryRevenue[category] += baseRate;
        }
      });
      
      console.log(`💰 Updated Category Revenue (Total Base Rates):`);
      console.log(`   🏢 Studio: ${categoryRevenue['Studio'].toFixed(2)} AED`);
      console.log(`   🏠 1BR: ${categoryRevenue['1BR'].toFixed(2)} AED`);
      console.log(`   🏡 2BR: ${categoryRevenue['2BR'].toFixed(2)} AED`);
      
      // Update totalRevenue to match Total Base Rate All Categories
      const grandTotalBaseRate = Object.values(categoryRevenue).reduce((sum, rate) => sum + rate, 0);
      totalRevenue = grandTotalBaseRate;
      actualRevenue = grandTotalBaseRate;
      
      console.log(`🏆 Updated Total Revenue (Total Base Rate All Categories): ${totalRevenue.toFixed(2)} AED`);
    }

    return {
      success: true,
      data: {
        totalRevenue,
        actualRevenue,
        expectedRevenue,
        occupancyRate,
        totalRooms,
        occupiedRooms,
        categoryRevenue,
        categoryAvailability,
        listingsData: DUBAI_LISTINGS_DATA,
        lastUpdated: new Date().toISOString(),
        currency: 'AED'
      }
    };

  } catch (error) {
    console.error('❌ Error processing Dubai revenue data:', error.message);
    throw error;
  }
}

/**
 * Get today's Dubai listing revenue by category
 * @returns {Promise<Object>} Today's Dubai revenue breakdown
 */
async function getTodayDubaiListingRevenue() {
  try {
    const revenueData = await getDubaiRevenueAndOccupancy();
    
    return {
      success: true,
      data: {
        studio: revenueData.data.categoryRevenue['Studio'] || 0,
        oneBR: revenueData.data.categoryRevenue['1BR'] || 0,
        twoBR: revenueData.data.categoryRevenue['2BR'] || 0,
        total: revenueData.data.totalRevenue,
        currency: 'AED',
        breakdown: revenueData.data.categoryRevenue,
        availability: revenueData.data.categoryAvailability,
        lastUpdated: revenueData.data.lastUpdated
      }
    };
  } catch (error) {
    console.error('❌ Error getting today Dubai listing revenue:', error.message);
    throw error;
  }
}

/**
 * Get Dubai listings by category
 * @returns {Promise<Object>} Dubai listings organized by category
 */
async function getDubaiListingsByCategory() {
  try {
    // Ensure we have fresh listings data
    if (!DUBAI_LISTINGS_DATA || Object.keys(DUBAI_LISTINGS_DATA).length === 0) {
      DUBAI_LISTINGS_DATA = await fetchDubaiListingsData();
    }

    return {
      success: true,
      data: DUBAI_LISTINGS_DATA,
      summary: {
        totalListings: Object.values(DUBAI_LISTINGS_DATA).reduce((sum, category) => sum + category.length, 0),
        categories: Object.keys(DUBAI_LISTINGS_DATA).map(category => ({
          name: category,
          count: DUBAI_LISTINGS_DATA[category].length
        }))
      }
    };
  } catch (error) {
    console.error('❌ Error getting Dubai listings by category:', error.message);
    throw error;
  }
}

module.exports = {
  fetchDubaiListingsData,
  refreshDubaiListingsCache,
  getDubaiRevenueAndOccupancy,
  getTodayDubaiListingRevenue,
  getDubaiListingsByCategory
};