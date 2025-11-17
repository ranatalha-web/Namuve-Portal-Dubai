/**
 * Dubai Revenue Service - Direct API Fetch (No Database)
 * Fetches revenue data directly from Hostaway API for Dubai listings
 */

const config = require('../config/config');

// Ensure fetch is available
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ Fetch not available');
  throw new Error('Fetch API not available');
}

/**
 * Get current date in Pakistan timezone (YYYY-MM-DD)
 */
function getPakistanDate() {
  const now = new Date();
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  
  const year = pakistanTime.getUTCFullYear();
  const month = (pakistanTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = pakistanTime.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get date range for current month
 */
function getCurrentMonthRange() {
  const now = new Date();
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  
  const year = pakistanTime.getUTCFullYear();
  const month = pakistanTime.getUTCMonth();
  
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0]
  };
}

/**
 * Fetch Dubai listings from Hostaway
 */
async function fetchDubaiListings() {
  try {
    const authToken = config.HOSTAWAY_AUTH_TOKEN;
    
    if (!authToken) {
      throw new Error('HOSTAWAY_AUTH_TOKEN not configured');
    }

    console.log('🏙️ Fetching Dubai listings from Hostaway...');
    
    const response = await fetch('https://api.hostaway.com/v1/listings?limit=200', {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Hostaway API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for Dubai listings (United Arab Emirates)
    const dubaiListings = (data.result || []).filter(listing => 
      listing.country === 'United Arab Emirates' && 
      listing.id && 
      listing.name
    );

    console.log(`✅ Found ${dubaiListings.length} Dubai listings`);
    
    return dubaiListings;
  } catch (error) {
    console.error('❌ Error fetching Dubai listings:', error.message);
    throw error;
  }
}

/**
 * Fetch reservations for Dubai listings (TODAY ONLY)
 */
async function fetchDubaiReservations(dubaiListingIds) {
  try {
    const authToken = config.HOSTAWAY_AUTH_TOKEN;
    const today = getPakistanDate();
    
    // Fetch only TODAY's reservations
    console.log(`📅 Fetching TODAY's reservations: ${today}`);
    process.stdout.write(`📅 Fetching TODAY's reservations: ${today}\n`);
    
    let allReservations = [];
    let page = 1;
    const limit = 100;
    let hasMorePages = true;

    while (hasMorePages && page <= 10) { // Limit to 10 pages (1000 reservations) for speed
      const offset = (page - 1) * limit;
      // Fetch all reservations, filter for today in calculateRevenue function
      const url = `https://api.hostaway.com/v1/reservations?includeResources=1&limit=${limit}&offset=${offset}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Hostaway API error: ${response.status}`);
      }

      const data = await response.json();
      const pageReservations = data.result || [];
      
      if (pageReservations.length > 0) {
        allReservations = allReservations.concat(pageReservations);
        page++;
        
        if (pageReservations.length < limit) {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
      
      // Safety check
      if (page > 50) {
        console.log('⚠️ Reached maximum page limit (50)');
        hasMorePages = false;
      }
    }

    console.log(`📦 Total reservations fetched: ${allReservations.length}`);

    // Filter for Dubai listings only
    const dubaiReservations = allReservations.filter(res => 
      dubaiListingIds.includes(Number(res.listingMapId))
    );

    console.log(`🏙️ Dubai reservations: ${dubaiReservations.length}`);
    
    return dubaiReservations;
  } catch (error) {
    console.error('❌ Error fetching reservations:', error.message);
    throw error;
  }
}

/**
 * Calculate revenue from reservations
 */
function calculateRevenue(reservations) {
  const today = getPakistanDate();
  const { startDate, endDate } = getCurrentMonthRange();
  
  let totalRevenue = 0;
  let monthlyRevenue = 0;
  let confirmedReservations = 0;
  let totalNights = 0;
  const reservationDetails = [];
  let totalDailyRevenue = 0; // Sum of all daily rates for today

  process.stdout.write('\n📋 Processing TODAY\'S Reservations (Status: new or modified):\n');
  process.stdout.write(`📅 Today's Date: ${today}\n`);
  process.stdout.write('========================================\n');
  
  console.log('\n📋 Processing TODAY\'S Reservations (Status: new or modified):');
  console.log(`📅 Today's Date: ${today}`);
  console.log('========================================');

  let displayCount = 0;
  
  reservations.forEach((reservation, index) => {
    const revenue = parseFloat(reservation.totalPrice) || 0;
    const baseRate = parseFloat(reservation.basePrice) || 0;
    const nights = reservation.nights || 0;
    const status = reservation.status;
    const checkIn = reservation.arrivalDate;
    const checkOut = reservation.departureDate;
    
    // Check if reservation is for TODAY (check-in today, check-out today, or staying today)
    const isTodayCheckIn = checkIn === today;
    const isTodayCheckOut = checkOut === today;
    const isStayingToday = checkIn <= today && checkOut >= today;
    const isTodayReservation = isTodayCheckIn || isTodayCheckOut || isStayingToday;
    
    // Only log reservations with status "new" or "modified" AND for TODAY
    if ((status === 'new' || status === 'modified') && isTodayReservation) {
      displayCount++;
      
      // Try multiple fields for listing name
      const listingName = reservation.listingMapName 
        || reservation.listingName 
        || reservation.listing?.name
        || (reservation.listingId ? `Listing ID: ${reservation.listingId}` : 'N/A');
      
      // Try multiple fields for base rate (total base rate for entire stay)
      const totalBaseRate = reservation.basePrice 
        || reservation.baseRate 
        || (revenue > 0 && nights > 0 ? revenue : 0);
      
      // Calculate daily rate (base rate per night)
      const dailyRate = nights > 0 ? totalBaseRate / nights : 0;
      
      // Determine reservation type for today
      let todayType = '';
      if (isTodayCheckIn && isTodayCheckOut) {
        todayType = '🔄 CHECK-IN & CHECK-OUT TODAY';
      } else if (isTodayCheckIn) {
        todayType = '📥 CHECK-IN TODAY';
      } else if (isTodayCheckOut) {
        todayType = '📤 CHECK-OUT TODAY';
      } else if (isStayingToday) {
        todayType = '🏨 STAYING TODAY';
      }
      
      // Add daily rate to total
      totalDailyRevenue += dailyRate;
      
      // Write directly to stdout to bypass any console overrides
      process.stdout.write(`\n${displayCount}. Reservation ID: ${reservation.id} [${todayType}]\n`);
      process.stdout.write(`   Guest: ${reservation.guestName || 'N/A'}\n`);
      process.stdout.write(`   Listing: ${listingName}\n`);
      process.stdout.write(`   Status: ${status}\n`);
      process.stdout.write(`   Check-in: ${reservation.arrivalDate || 'N/A'}\n`);
      process.stdout.write(`   Check-out: ${reservation.departureDate || 'N/A'}\n`);
      process.stdout.write(`   Nights: ${nights}\n`);
      process.stdout.write(`   Daily Rate: ${dailyRate.toFixed(2)} AED/night (Total: ${totalBaseRate.toFixed(2)} AED)\n`);
      process.stdout.write(`   Total Price: ${revenue.toFixed(2)} AED\n`);
      
      console.log(`\n${displayCount}. Reservation ID: ${reservation.id} [${todayType}]`);
      console.log(`   Guest: ${reservation.guestName || 'N/A'}`);
      console.log(`   Listing: ${listingName}`);
      console.log(`   Status: ${status}`);
      console.log(`   Check-in: ${reservation.arrivalDate || 'N/A'}`);
      console.log(`   Check-out: ${reservation.departureDate || 'N/A'}`);
      console.log(`   Nights: ${nights}`);
      console.log(`   Daily Rate: ${dailyRate.toFixed(2)} AED/night (Total: ${totalBaseRate.toFixed(2)} AED)`);
      console.log(`   Total Price: ${revenue.toFixed(2)} AED`);
      
      // Debug: Show all available fields for first reservation
      if (displayCount === 1) {
        console.log(`   🔍 DEBUG - Available fields:`, Object.keys(reservation));
      }
    }
    
    // Only count confirmed/approved reservations
    if (status === 'confirmed' || status === 'approved') {
      totalRevenue += revenue;
      
      // Check if reservation is in current month
      const arrivalDate = reservation.arrivalDate;
      if (arrivalDate >= startDate && arrivalDate <= endDate) {
        monthlyRevenue += revenue;
      }
      
      confirmedReservations++;
      totalNights += nights;
      
      // Add to details array
      reservationDetails.push({
        id: reservation.id,
        guestName: reservation.guestName || 'N/A',
        listingName: reservation.listingMapName || 'N/A',
        status: status,
        checkIn: reservation.arrivalDate,
        checkOut: reservation.departureDate,
        nights: nights,
        baseRate: baseRate.toFixed(2),
        totalPrice: revenue.toFixed(2),
        currency: 'AED'
      });
      
      console.log(`   ✅ COUNTED (${status})`);
    } else {
      console.log(`   ⏭️  SKIPPED (${status})`);
    }
  });

  process.stdout.write('\n========================================\n');
  process.stdout.write(`📊 Total TODAY's "new" or "modified" reservations: ${displayCount}\n`);
  process.stdout.write(`📅 Date: ${today}\n`);
  process.stdout.write(`💰 TOTAL DAILY REVENUE: ${totalDailyRevenue.toFixed(2)} AED\n`);
  process.stdout.write('========================================\n\n');
  
  console.log('\n========================================');
  console.log(`📊 Total TODAY's "new" or "modified" reservations: ${displayCount}`);
  console.log(`📅 Date: ${today}`);
  console.log(`💰 TOTAL DAILY REVENUE: ${totalDailyRevenue.toFixed(2)} AED`);
  console.log('========================================\n');

  return {
    totalRevenue: totalRevenue.toFixed(2),
    monthlyRevenue: monthlyRevenue.toFixed(2),
    confirmedReservations,
    totalNights,
    averageNightlyRate: totalNights > 0 ? (totalRevenue / totalNights).toFixed(2) : '0',
    currency: 'AED', // Dubai uses AED
    reservations: reservationDetails,
    newOrModifiedCount: displayCount,
    totalDailyRevenue: totalDailyRevenue.toFixed(2) // Sum of all daily rates for today
  };
}

/**
 * Get Dubai Revenue Data (Main Function)
 */
async function getDubaiRevenue() {
  try {
    // FORCE OUTPUT - Cannot be suppressed
    process.stdout.write('\n\n');
    process.stdout.write('='.repeat(50) + '\n');
    process.stdout.write('🏙️  DUBAI REVENUE CALCULATION STARTED\n');
    process.stdout.write('='.repeat(50) + '\n');
    process.stdout.write('\n');
    
    console.log('\n========================================');
    console.log('🏙️  DUBAI REVENUE CALCULATION STARTED');
    console.log('========================================');
    const startTime = Date.now();

    // Step 1: Fetch Dubai listings
    const dubaiListings = await fetchDubaiListings();
    
    if (dubaiListings.length === 0) {
      return {
        success: true,
        revenue: {
          totalRevenue: '0',
          monthlyRevenue: '0',
          confirmedReservations: 0,
          totalNights: 0,
          averageNightlyRate: '0',
          currency: 'AED'
        },
        listings: [],
        message: 'No Dubai listings found',
        timestamp: new Date().toISOString()
      };
    }

    const dubaiListingIds = dubaiListings.map(listing => Number(listing.id));

    // Step 2: Fetch reservations for Dubai listings
    const reservations = await fetchDubaiReservations(dubaiListingIds);

    // Step 3: Calculate revenue
    const revenue = calculateRevenue(reservations);

    // Step 4: Prepare listing details
    const listingDetails = dubaiListings.map(listing => ({
      id: listing.id,
      name: listing.name,
      city: listing.city,
      country: listing.country,
      address: listing.address
    }));

    const processingTime = Date.now() - startTime;
    
    console.log('\n========================================');
    console.log('✅ DUBAI REVENUE CALCULATION COMPLETE');
    console.log('========================================');
    console.log(`📊 Total Listings: ${dubaiListings.length}`);
    console.log(`📦 Total Reservations Found: ${reservations.length}`);
    console.log(`✅ Confirmed/Approved: ${revenue.confirmedReservations}`);
    console.log(`💰 Total Revenue: ${revenue.totalRevenue} ${revenue.currency}`);
    console.log(`📅 Monthly Revenue: ${revenue.monthlyRevenue} ${revenue.currency}`);
    console.log(`🌙 Total Nights: ${revenue.totalNights}`);
    console.log(`💵 Average Nightly Rate: ${revenue.averageNightlyRate} ${revenue.currency}`);
    console.log(`⏱️  Processing Time: ${processingTime}ms`);
    console.log('========================================\n');

    return {
      success: true,
      revenue,
      listings: listingDetails,
      totalListings: dubaiListings.length,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error calculating Dubai revenue:', error.message);
    
    return {
      success: false,
      error: error.message,
      revenue: {
        totalRevenue: '0',
        monthlyRevenue: '0',
        confirmedReservations: 0,
        totalNights: 0,
        averageNightlyRate: '0',
        currency: 'AED'
      },
      listings: [],
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  getDubaiRevenue,
  fetchDubaiListings,
  fetchDubaiReservations,
  calculateRevenue
};
