/**
 * dubaiPayment.js - Dubai Hostaway Reservations API
 * Fetches reservation data from Hostaway API for today's new/modified reservations in Dubai
 */

const express = require('express');
const router = express.Router();

// Ensure fetch is available (Node.js 18+ has it built-in, older versions need polyfill)
let fetch;
try {
  // Try to use built-in fetch (Node.js 18+)
  fetch = globalThis.fetch;
  if (!fetch) {
    // Fallback to node-fetch for older Node.js versions
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ Fetch not available. Installing node-fetch...');
  try {
    fetch = require('node-fetch');
  } catch (fetchError) {
    console.error('❌ node-fetch not installed. Please run: npm install node-fetch');
    throw new Error('Fetch API not available. Please install node-fetch or upgrade to Node.js 18+');
  }
}

/**
 * Get today's date in UAE timezone (YYYY-MM-DD format)
 */
function getTodayDate() {
  // Get UAE date and time (+4 hours)
  const now = new Date();
  const uaeTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
  
  // Format as YYYY-MM-DD
  const year = uaeTime.getUTCFullYear();
  const month = (uaeTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = uaeTime.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Categorize apartment type based on listing name or bedroom count
 */
function categorizeApartment(listing) {
  const name = (listing.name || '').toLowerCase();
  const bedrooms = listing.bedrooms || 0;
  
  // Check by name first
  if (name.includes('studio')) return 'Studio';
  if (name.includes('1br') || name.includes('1 br') || name.includes('one bedroom')) return '1BR';
  if (name.includes('2br') || name.includes('2 br') || name.includes('two bedroom')) return '2BR';
  
  // Check by bedroom count
  if (bedrooms === 0) return 'Studio';
  if (bedrooms === 1) return '1BR';
  if (bedrooms === 2) return '2BR';
  
  // Default fallback
  return 'Unknown';
}

/**
 * Fetch reservations from Hostaway API
 */
async function fetchTodayReservations() {
  try {
    console.log('🔄 Fetching today\'s Dubai reservations from Hostaway API...');
    
    const authToken = process.env.HOSTAWAY_AUTH_TOKEN;
    if (!authToken) {
      throw new Error('HOSTAWAY_AUTH_TOKEN not configured');
    }
    
    const today = getTodayDate();
    console.log(`📅 Today's date (UAE timezone): ${today}`);
    
    // Fetch reservations with pagination
    let allReservations = [];
    let page = 1;
    const limit = 100;
    let hasMorePages = true;
    
    while (hasMorePages) {
      console.log(`📄 Fetching page ${page} (limit: ${limit})...`);
      
      // Fetch recent reservations (last 7 days) to find today's relevant reservations
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      
      const url = `https://api.hostaway.com/v1/reservations?limit=${limit}&offset=${(page - 1) * limit}&modifiedSince=${sevenDaysAgoStr}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Hostaway API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const pageReservations = data.result || [];
      
      console.log(`📦 Page ${page}: ${pageReservations.length} reservations`);
      
      if (pageReservations.length > 0) {
        allReservations = allReservations.concat(pageReservations);
        page++;
        
        // If we got fewer than the limit, we've reached the last page
        if (pageReservations.length < limit) {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
      
      // Safety check to prevent infinite loops
      if (page > 50) {
        console.log(`⚠️ Reached maximum page limit (50), stopping pagination`);
        hasMorePages = false;
      }
    }
    
    console.log(`📦 Total reservations fetched: ${allReservations.length} from ${page - 1} pages`);
    console.log(`📋 Processing ${allReservations.length} reservations for today`);
    
    // First, get Dubai listings to filter reservations
    console.log('🇦🇪 Fetching Dubai listings for filtering...');
    let dubaiListingIds = [];
    let listingsWithCategories = {};
    
    try {
      const listingsResponse = await fetch('https://api.hostaway.com/v1/listings?limit=200', {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (listingsResponse.ok) {
        const listingsData = await listingsResponse.json();
        if (listingsData?.result) {
          // Filter Dubai listings
          const dubaiListings = listingsData.result.filter(listing => 
            listing.country === 'United Arab Emirates' && listing.id && listing.name
          );
          
          dubaiListingIds = dubaiListings.map(listing => Number(listing.id));
          
          // Create categories mapping
          dubaiListings.forEach(listing => {
            listingsWithCategories[listing.id] = {
              name: listing.name,
              category: categorizeApartment(listing),
              bedrooms: listing.bedrooms || 0
            };
          });
          
          console.log(`🇦🇪 Found ${dubaiListingIds.length} Dubai listings: [${dubaiListingIds.join(', ')}]`);
          console.log(`🏠 Categories:`, Object.values(listingsWithCategories).reduce((acc, listing) => {
            acc[listing.category] = (acc[listing.category] || 0) + 1;
            return acc;
          }, {}));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching Dubai listings:', error.message);
    }
    
    console.log(`🔍 Processing reservations for today: ${today}`);
    console.log(`📊 Total reservations to process: ${allReservations.length}`);
    
    // Filter reservations for Dubai listings and today's activity
    const filteredReservations = allReservations.filter(reservation => {
      // Must be for Dubai listings
      if (!dubaiListingIds.includes(Number(reservation.listingId))) {
        return false;
      }
      
      // Must have valid dates
      if (!reservation.arrivalDate || !reservation.departureDate) {
        return false;
      }
      
      const arrival = new Date(reservation.arrivalDate);
      const departure = new Date(reservation.departureDate);
      const todayDate = new Date(today);
      
      // TEMPORARILY: Include reservations from last 30 days for testing
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Include if: currently staying, checking in today, checking out today, OR within last 30 days
      const isWithinStayPeriod = (todayDate >= arrival && todayDate < departure);
      const isCheckingInToday = arrival.toDateString() === todayDate.toDateString();
      const isCheckingOutToday = departure.toDateString() === todayDate.toDateString();
      const isRecentReservation = arrival >= thirtyDaysAgo || departure >= thirtyDaysAgo;
      
      return isWithinStayPeriod || isCheckingInToday || isCheckingOutToday || isRecentReservation;
    });
    
    console.log(`✅ Filtered to ${filteredReservations.length} Dubai reservations for today`);
    console.log(`📊 DEBUG: Total reservations fetched: ${allReservations.length}`);
    console.log(`🇦🇪 DEBUG: Dubai listings found: ${dubaiListingIds.length}`);
    console.log(`🏠 DEBUG: Dubai listing IDs: [${dubaiListingIds.join(', ')}]`);
    
    // Debug stats
    const debugStats = {
      withinStayPeriod: 0,
      checkingInToday: 0,
      checkingOutToday: 0
    };
    
    // Count stay period matches
    allReservations.forEach(res => {
      if (res.arrivalDate && res.departureDate) {
        const arrival = new Date(res.arrivalDate);
        const departure = new Date(res.departureDate);
        const todayDate = new Date(today);
        
        const isWithinStayPeriod = (todayDate >= arrival && todayDate < departure);
        const isCheckingInToday = arrival.toDateString() === todayDate.toDateString();
        const isCheckingOutToday = departure.toDateString() === todayDate.toDateString();
        
        if (isWithinStayPeriod) debugStats.withinStayPeriod++;
        if (isCheckingInToday) debugStats.checkingInToday++;
        if (isCheckingOutToday) debugStats.checkingOutToday++;
      }
    });
    
    console.log(`📈 Debug Stats:`, debugStats);
    console.log(`📊 Breakdown: Staying(${debugStats.withinStayPeriod}) + CheckIn(${debugStats.checkingInToday}) + CheckOut(${debugStats.checkingOutToday}) = ${debugStats.withinStayPeriod + debugStats.checkingInToday + debugStats.checkingOutToday} potential matches`);
    
    // Transform data for frontend with finance data
    const transformedReservations = await Promise.all(filteredReservations.map(async (reservation) => {
      // Log original payment status from Hostaway
      console.log(`📋 Reservation ${reservation.id} - Original Hostaway payment status: "${reservation.paymentStatus}" (isPaid: ${reservation.isPaid})`);
      
      // Get listing category
      const listingInfo = listingsWithCategories[reservation.listingId] || {};
      
      // Determine payment status and calculate amounts
      let paymentStatus = 'Unpaid';
      const totalAmount = reservation.totalPrice || 0;
      let paidAmount = 0;
      let remainingAmount = totalAmount;
      
      // Fetch accurate payment data from Hostaway Finance API
      let financeData = null;
      try {
        const financeUrl = `https://api.hostaway.com/v1/financeCalculatedField/reservation/${reservation.id}`;
        const financeResponse = await fetch(financeUrl, {
          method: 'GET',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (financeResponse.ok) {
          const financeResult = await financeResponse.json();
          if (financeResult.result && Array.isArray(financeResult.result)) {
            // Find the finance data with formulaFilled
            financeData = financeResult.result.find(item => 
              item.formulaFilled && item.formulaFilled.includes('-')
            );
            
            if (financeData) {
              console.log(`💰 Finance data found for reservation ${reservation.id}:`, {
                formulaFilled: financeData.formulaFilled,
                formulaResult: financeData.formulaResult
              });
            }
          }
        }
      } catch (financeError) {
        console.log(`⚠️ Could not fetch finance data for reservation ${reservation.id}:`, financeError.message);
      }
      
      // Use finance data if available for accurate calculations
      if (financeData && financeData.formulaFilled) {
        const formulaParts = financeData.formulaFilled.split('-');
        if (formulaParts.length === 2) {
          const totalFromFormula = parseFloat(formulaParts[0]) || 0;
          const paidFromFormula = parseFloat(formulaParts[1]) || 0;
          const remainingFromFormula = financeData.formulaResult || 0;
          
          // Use finance data for accurate amounts
          paidAmount = paidFromFormula;
          remainingAmount = remainingFromFormula;
          
          // Determine status based on amounts
          if (remainingFromFormula <= 0 && paidFromFormula > 0) {
            paymentStatus = 'Paid';
          }
          else if (paidAmount > 0 && remainingAmount > 0) {
            paymentStatus = 'Partially paid';
          }
        }
      } else {
        // Fallback to original logic if finance data not available
        if (reservation.isPaid || reservation.paymentStatus === 'paid') {
          paymentStatus = 'Paid';
          paidAmount = totalAmount;
          remainingAmount = 0;
        } else if (reservation.paymentStatus === 'partially_paid' || reservation.paymentStatus === 'Partially paid') {
          paymentStatus = 'Partially paid';
          // Calculate paid amount from payments if available
          if (reservation.payments && Array.isArray(reservation.payments)) {
            paidAmount = reservation.payments.reduce((sum, payment) => {
              return sum + (payment.amount || 0);
            }, 0);
          } else if (reservation.paidAmount) {
            paidAmount = reservation.paidAmount;
          } else if (reservation.totalPaid) {
            paidAmount = reservation.totalPaid;
          } else if (reservation.amountPaid) {
            paidAmount = reservation.amountPaid;
          } else if (reservation.balance !== undefined) {
            // If balance is available, paid = total - balance
            paidAmount = Math.max(0, totalAmount - reservation.balance);
          } else {
            // Try to get from financial data
            paidAmount = reservation.financialData?.totalPaid || 0;
          }
          remainingAmount = Math.max(0, totalAmount - paidAmount);
        } else if (reservation.paymentStatus) {
          // Handle other payment statuses, convert only 'unknown' and 'pending' to 'Due'
          if (reservation.paymentStatus.toLowerCase() === 'unknown' ||
              reservation.paymentStatus.toLowerCase() === 'pending') {
            paymentStatus = 'Due';
          } else {
            paymentStatus = reservation.paymentStatus;
          }
          paidAmount = 0;
          remainingAmount = totalAmount;
        }
      }
      
      // Debug: Log calculated amounts with original status comparison
      console.log(`💰 Reservation ${reservation.id} calculated amounts:`, {
        originalHostawayStatus: reservation.paymentStatus || 'N/A',
        totalAmount,
        paidAmount,
        remainingAmount,
        finalStatus: paymentStatus,
        listingCategory: listingInfo.category || 'Unknown'
      });
      
      return {
        id: reservation.id,
        guestName: reservation.guestName || 'N/A',
        listingName: reservation.listingName || listingInfo.name || 'N/A',
        listingCategory: listingInfo.category || 'Unknown',
        arrivalDate: reservation.arrivalDate,
        departureDate: reservation.departureDate,
        nights: reservation.nights || 0,
        guests: reservation.guests || 0,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        paymentStatus: paymentStatus,
        currency: reservation.currency || 'AED',
        createdAt: reservation.createdAt,
        modifiedAt: reservation.modifiedAt,
        listingId: reservation.listingId,
        bedrooms: listingInfo.bedrooms || 0
      };
    }));
    
    // Sort by modification date (newest first)
    transformedReservations.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    
    console.log(`✅ Successfully processed ${transformedReservations.length} Dubai reservations`);
    
    // Log category breakdown
    const categoryBreakdown = transformedReservations.reduce((acc, res) => {
      acc[res.listingCategory] = (acc[res.listingCategory] || 0) + 1;
      return acc;
    }, {});
    console.log(`🏠 Reservation category breakdown:`, categoryBreakdown);
    
    return {
      success: true,
      data: transformedReservations,
      total: transformedReservations.length,
      date: today
    };
    
  } catch (error) {
    console.error('❌ Error fetching Dubai reservations:', error);
    throw error;
  }
}

/**
 * GET /api/dubai-payment/today-reservations
 * Get today's new/modified Dubai reservations
 */
router.get('/today-reservations', async (req, res) => {
  try {
    console.log('🔄 API call: GET /api/dubai-payment/today-reservations');
    
    const result = await fetchTodayReservations();
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error in /today-reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s Dubai reservations',
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-payment/debug
 * Debug endpoint to see raw reservation data
 */
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Fetching raw reservation data...');
    
    const authToken = process.env.HOSTAWAY_AUTH_TOKEN;
    if (!authToken) {
      return res.json({ error: 'HOSTAWAY_AUTH_TOKEN not configured' });
    }
    
    // Fetch recent reservations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const url = `https://api.hostaway.com/v1/reservations?limit=50&modifiedSince=${thirtyDaysAgoStr}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.json({ error: `Hostaway API error: ${response.status}` });
    }
    
    const data = await response.json();
    const reservations = data.result || [];
    
    // Also fetch Dubai listings
    const listingsResponse = await fetch('https://api.hostaway.com/v1/listings?limit=200', {
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      }
    });
    
    let dubaiListings = [];
    if (listingsResponse.ok) {
      const listingsData = await listingsResponse.json();
      if (listingsData?.result) {
        dubaiListings = listingsData.result.filter(listing => 
          listing.country === 'United Arab Emirates'
        );
      }
    }
    
    res.json({
      success: true,
      debug: {
        totalReservations: reservations.length,
        dubaiListingsCount: dubaiListings.length,
        dubaiListingIds: dubaiListings.map(l => l.id),
        sampleReservations: reservations.slice(0, 5).map(r => ({
          id: r.id,
          listingId: r.listingId,
          arrivalDate: r.arrivalDate,
          departureDate: r.departureDate,
          status: r.status
        })),
        dubaiListings: dubaiListings.map(l => ({
          id: l.id,
          name: l.name,
          country: l.country
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-payment/reservation/:id
 * Get specific Dubai reservation details
 */
router.get('/reservation/:id', async (req, res) => {
  try {
    const reservationId = req.params.id;
    console.log(`🔄 API call: GET /api/dubai-payment/reservation/${reservationId}`);
    
    // For now, return not implemented
    res.json({
      success: false,
      data: null,
      error: 'Individual reservation details not yet implemented'
    });
    
  } catch (error) {
    console.error(`❌ Error fetching Dubai reservation ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Dubai reservation details',
      error: error.message
    });
  }
});

/**
 * GET /api/dubai-payment/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const token = process.env.HOSTAWAY_AUTH_TOKEN;
  res.json({
    success: true,
    message: 'Dubai Payment API is healthy',
    timestamp: new Date().toISOString(),
    token_configured: !!token,
    token_length: token ? token.length : 0,
    token_preview: token ? token.substring(0, 10) + '...' : 'NOT_SET'
  });
});

// Export the function for use by other modules
module.exports = router;
module.exports.fetchTodayReservationsData = async () => {
  const result = await fetchTodayReservations();
  return result.data; // Return just the data array
};
