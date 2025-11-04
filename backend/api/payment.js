/**
 * payment.js - Hostaway Reservations API
 * Fetches reservation data from Hostaway API for today's new/modified reservations
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
 * Get today's date in Pakistan timezone (YYYY-MM-DD format)
 */
function getTodayDate() {
  // Get Pakistan date and time
  const now = new Date();
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  
  // Format as YYYY-MM-DD
  const year = pakistanTime.getUTCFullYear();
  const month = (pakistanTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = pakistanTime.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Fetch reservations from Hostaway API
 */
async function fetchTodayReservations() {
  try {
    console.log('🔄 Fetching today\'s reservations from Hostaway API...');
    
    const today = getTodayDate();
    console.log(`📅 Today's date: ${today}`);
    
    // Debug authentication token
    const authToken = process.env.HOSTAWAY_AUTH_TOKEN;
    console.log(`🔑 Token exists: ${!!authToken}`);
    console.log(`🔑 Token length: ${authToken ? authToken.length : 0}`);
    console.log(`🔑 Token preview: ${authToken ? authToken.substring(0, 10) + '...' : 'NOT_SET'}`);
    
    if (!authToken) {
      throw new Error('HOSTAWAY_AUTH_TOKEN environment variable is not set');
    }
    
    // Fetch ALL reservations with pagination
    let allReservations = [];
    let page = 1;
    const limit = 100; // Hostaway API limit per page
    let hasMorePages = true;
    
    console.log(`📄 Fetching reservations with pagination...`);
    
    while (hasMorePages) {
      const offset = (page - 1) * limit;
      const url = `https://api.hostaway.com/v1/reservations?includeResources=1&limit=${limit}&offset=${offset}`;
      console.log(`📄 Fetching page ${page}: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json',
          'Cache-control': 'no-cache'
        }
      });
      
      console.log(`📡 Page ${page} response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`Hostaway API error on page ${page}: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const pageReservations = data.result || [];
      
      console.log(`📦 Page ${page}: Received ${pageReservations.length} reservations`);
      
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
    
    // First, get Pakistani listings to filter reservations
    console.log('🇵🇰 Fetching Pakistani listings for filtering...');
    let pakistaniListingIds = [];
    
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
          // Filter Pakistani listings exactly like revenue.js
          const pakistaniListings = listingsData.result.filter(listing => 
            listing.country === 'Pakistan' && listing.id && listing.name
          );
          
          pakistaniListingIds = pakistaniListings.map(listing => Number(listing.id));
          console.log(`🇵🇰 Found ${pakistaniListingIds.length} Pakistani listings: [${pakistaniListingIds.join(', ')}]`);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching Pakistani listings:', error.message);
    }
    
    console.log(`🔍 Processing reservations for today: ${today}`);
    console.log(`📊 Total reservations to process: ${allReservations.length}`);
    console.log(`🏠 Pakistani listing IDs: ${pakistaniListingIds.join(', ')}`);
    
    // Filter reservations exactly like revenue.js
    const filteredReservations = allReservations.filter(res => {
      // Check dates
      if (!res.arrivalDate || !res.departureDate) return false;
      
      // Include only reservations with status 'new' or 'modified'
      if (res.status !== 'new' && res.status !== 'modified') return false;
      
      // Check if listing is in allowed Pakistani listings (use listingMapId like revenue.js)
      if (pakistaniListingIds.length > 0 && !pakistaniListingIds.includes(Number(res.listingMapId))) {
        return false;
      }
      
      // Show all reservations where today is within the stay period (staying guests)
      const arrivalDate = res.arrivalDate;
      const departureDate = res.departureDate;
      
      const arrival = new Date(arrivalDate);
      const departure = new Date(departureDate);
      const todayDate = new Date(today);
      
      // Include reservations where:
      // 1. Today is within the stay period (staying guests)
      // 2. Checking in today (today's check-ins)
      // 3. Checking out today (today's check-outs)
      const isWithinStayPeriod = (todayDate >= arrival && todayDate < departure);
      const isCheckingInToday = arrival.toDateString() === todayDate.toDateString();
      const isCheckingOutToday = departure.toDateString() === todayDate.toDateString();
      
      if (!isWithinStayPeriod && !isCheckingInToday && !isCheckingOutToday) return false;
      
      // Check for test guests (same as revenue.js)
      const guestName = res.guestName || res.firstName || res.lastName || '';
      const isTestGuest = !guestName || /test|testing|guests|new guest/i.test(guestName);
      if (isTestGuest) return false;
      
      return true;
    });
    
    console.log(`✅ Filtered to ${filteredReservations.length} valid reservations`);
    
    // Debug: Count reservations by filter criteria
    const debugStats = {
      total: allReservations.length,
      withDates: allReservations.filter(r => r.arrivalDate && r.departureDate).length,
      newOrModified: allReservations.filter(r => r.status === 'new' || r.status === 'modified').length,
      pakistaniListings: allReservations.filter(r => pakistaniListingIds.includes(Number(r.listingMapId))).length,
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
            // Find the Balance formula
            financeData = financeResult.result.find(item => 
              item.formulaName === 'Balance' && 
              item.formulaValue === 'totalPrice-totalPaid'
            );
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch finance data for reservation ${reservation.id}:`, error.message);
      }
      
      // Debug: Log finance data
      if (financeData) {
        console.log(`💰 Reservation ${reservation.id} finance data:`, {
          formulaFilled: financeData.formulaFilled,
          formulaResult: financeData.formulaResult,
          totalFromFormula: financeData.formulaFilled?.split('-')[0],
          paidFromFormula: financeData.formulaFilled?.split('-')[1]
        });
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
          
          // Determine payment status based on amounts
          // Priority 1: Check if nothing paid (paidAmount = 0)
          if (paidAmount === 0) {
            // Nothing paid yet - check if Unknown/Pending or Unpaid
            if (reservation.paymentStatus && 
                (reservation.paymentStatus.toLowerCase() === 'unknown' || 
                 reservation.paymentStatus.toLowerCase() === 'pending')) {
              paymentStatus = 'Due';
            } else {
              paymentStatus = 'Unpaid';
            }
          } 
          // Priority 2: Check if fully paid
          else if (paidAmount > 0 && remainingAmount <= 0) {
            paymentStatus = 'Paid';
          } 
          // Priority 3: Partially paid
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
        finalPaymentStatus: paymentStatus,
        statusChanged: reservation.paymentStatus !== paymentStatus
      });
      
      // Highlight status conversions
      if (reservation.paymentStatus && reservation.paymentStatus.toLowerCase() === 'unknown' && paymentStatus === 'Due') {
        console.log(`   🔄 STATUS CONVERSION: "Unknown" → "Due" for reservation ${reservation.id}`);
      } else if (paymentStatus === 'Unpaid') {
        console.log(`   ✅ STATUS CONFIRMED: "Unpaid" for reservation ${reservation.id} (Original: "${reservation.paymentStatus || 'N/A'}")`);
      }
      
      // Get actual check-in time from custom field (ID: 76281)
      let actualCheckInTime = 'N/A';
      if (reservation.customFieldValues && Array.isArray(reservation.customFieldValues)) {
        const checkInField = reservation.customFieldValues.find(field => 
          field.customFieldId === 76281 && 
          field.customField?.name === "Actual Check-in Time" &&
          field.value && 
          field.value.trim() !== ""
        );
        if (checkInField) {
          actualCheckInTime = checkInField.value.trim();
        }
      }
      
      // Get actual check-out time from custom field (ID: 76282)
      let actualCheckOutTime = 'N/A';
      if (reservation.customFieldValues && Array.isArray(reservation.customFieldValues)) {
        const checkOutField = reservation.customFieldValues.find(field => 
          field.customFieldId === 76282 && 
          field.customField?.name === "Actual Check-out Time" &&
          field.value && 
          field.value.trim() !== ""
        );
        if (checkOutField) {
          actualCheckOutTime = checkOutField.value.trim();
        }
      }
      
      // Determine guest type (Today's Check-in, Today's Check-out, or Staying Guest)
      const arrival = new Date(reservation.arrivalDate);
      const departure = new Date(reservation.departureDate);
      const todayDate = new Date(today);
      const isCheckInToday = arrival.toDateString() === todayDate.toDateString();
      const isCheckOutToday = departure.toDateString() === todayDate.toDateString();
      
      let guestType;
      if (isCheckOutToday && !isCheckInToday) {
        // Checking out today (but didn't check in today)
        guestType = actualCheckOutTime !== 'N/A' ? 'Today\'s Check-out' : 'Expected Check-out';
      } else if (isCheckInToday && isCheckOutToday) {
        // Same day check-in and check-out
        guestType = 'Same Day Stay';
      } else if (isCheckInToday) {
        // If checking in today, check if they have actually checked in
        guestType = actualCheckInTime !== 'N/A' ? 'Today\'s Check-in' : 'Expected Check-in';
      } else {
        guestType = 'Staying Guest';
      }
      
      return {
        id: reservation.id,
        reservationId: reservation.id,
        guestName: reservation.guestName || 'N/A',
        listingName: reservation.listingMapName || reservation.listingName || 'N/A',
        checkInDate: reservation.arrivalDate || 'N/A',
        checkOutDate: reservation.departureDate || 'N/A',
        actualCheckInTime: actualCheckInTime,
        actualCheckOutTime: actualCheckOutTime,
        guestType: guestType,
        baseRate: reservation.totalPrice || 0,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        paymentStatus: paymentStatus,
        status: reservation.status,
        currency: reservation.currency || 'USD',
        nights: reservation.nights || 0,
        guests: reservation.guestsCount || 0,
        listingId: reservation.listingMapId
      };
    }));
    
    console.log(`✅ Processed ${transformedReservations.length} reservations (staying guests + today's check-ins + today's check-outs) with payment status and actual times`);
    
    // Debug: Count how many have check-out times
    const checkOutCount = transformedReservations.filter(r => r.actualCheckOutTime !== 'N/A').length;
    console.log(`🚪 Reservations with actual check-out times: ${checkOutCount}/${transformedReservations.length}`);
    
    // Debug: Payment amounts summary
    const paymentSummary = {
      totalPaid: transformedReservations.filter(r => r.paymentStatus === 'Paid').length,
      totalPartiallyPaid: transformedReservations.filter(r => r.paymentStatus === 'Partially paid').length,
      totalUnpaid: transformedReservations.filter(r => r.paymentStatus === 'Unpaid').length,
      totalDue: transformedReservations.filter(r => r.paymentStatus === 'Due').length,
      totalAmount: transformedReservations.reduce((sum, r) => sum + r.totalAmount, 0),
      totalPaidAmount: transformedReservations.reduce((sum, r) => sum + r.paidAmount, 0),
      totalRemainingAmount: transformedReservations.reduce((sum, r) => sum + r.remainingAmount, 0)
    };
    console.log(`💰 Payment Summary:`, paymentSummary);
    
    return {
      success: true,
      data: transformedReservations,
      total: transformedReservations.length,
      date: today
    };
    
  } catch (error) {
    console.error('❌ Error fetching reservations:', error);
    throw error;
  }
}

/**
 * GET /api/payment/today-reservations
 * Get today's new/modified reservations
 */
router.get('/today-reservations', async (req, res) => {
  try {
    console.log('🔄 API call: GET /api/payment/today-reservations');
    
    const result = await fetchTodayReservations();
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error in /today-reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s reservations',
      error: error.message
    });
  }
});

/**
 * GET /api/payment/reservation/:id
 * Get specific reservation details
 */
router.get('/reservation/:id', async (req, res) => {
  try {
    const reservationId = req.params.id;
    console.log(`🔄 API call: GET /api/payment/reservation/${reservationId}`);
    
    const authToken = process.env.HOSTAWAY_AUTH_TOKEN;
    const url = `https://api.hostaway.com/v1/reservations/${reservationId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Hostaway API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      data: data.result
    });
    
  } catch (error) {
    console.error(`❌ Error fetching reservation ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reservation details',
      error: error.message
    });
  }
});

/**
 * GET /api/payment/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const token = process.env.HOSTAWAY_AUTH_TOKEN;
  res.json({
    success: true,
    message: 'Payment API is healthy',
    timestamp: new Date().toISOString(),
    token_configured: !!token,
    token_length: token ? token.length : 0,
    token_preview: token ? token.substring(0, 10) + '...' : 'NOT_SET'
  });
});

// Export the function for use by payment-teable.js
module.exports = router;
module.exports.fetchTodayReservationsData = async () => {
  const result = await fetchTodayReservations();
  return result.data; // Return just the data array
};
