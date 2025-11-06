const fetch = require('node-fetch');
require('dotenv').config();

const TEABLE_API_URL = 'https://teable.namuve.com/api';
const TEABLE_TABLE_ID = 'tblMvZmQMgNPECSaGh1';
const TEABLE_TOKEN = process.env.TEABLE_BEARER_TOKEN || process.env.TEABLE_TOKEN;

// Validate environment variables on load
if (!TEABLE_TOKEN) {
  console.error('❌ CRITICAL: TEABLE_TOKEN environment variable is not set!');
  console.error('❌ Payment-Teable API will not work without this token.');
} else {
  console.log('✅ TEABLE_TOKEN is configured');
}

/**
 * Fetch all payment records from Teable with pagination
 */
const fetchAllPaymentRecords = async () => {
  try {
    console.log('📋 Fetching all payment records from Teable...');
    
    let allRecords = [];
    let skip = 0;
    const take = 100;
    let hasMore = true;

    while (hasMore) {
      const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}/record?skip=${skip}&take=${take}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Teable API error: ${response.status} ${response.statusText}`);
        console.error(`❌ Error details: ${errorText}`);
        throw new Error(`Failed to fetch records: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const records = data.records || [];
      
      allRecords = allRecords.concat(records);
      
      if (records.length < take) {
        hasMore = false;
      } else {
        skip += take;
      }
    }

    console.log(`✅ Fetched ${allRecords.length} payment records from Teable`);
    return allRecords;
  } catch (error) {
    console.error('❌ Error fetching payment records:', error.message);
    throw error;
  }
};

/**
 * Create a new payment record in Teable
 */
const createPaymentRecord = async (paymentData) => {
  try {
    const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}/record`;
    
    const recordData = {
      records: [
        {
          fields: {
            "Reservation ID ": String(paymentData.reservationId),
            "Guest Name": String(paymentData.guestName),
            "Listing Name": String(paymentData.listingName),
            "Arrival Date": String(paymentData.checkInDate),
            "Departure Date": String(paymentData.checkOutDate),
            "Actual Check-in Time": String(paymentData.actualCheckInTime || 'N/A'),
            "Actual Check-out Time": String(paymentData.actualCheckOutTime || 'N/A'),
            "Total Amount ": String(paymentData.totalAmount),
            "Remaining Amount": String(paymentData.remainingAmount),
            "Payment Status": String(paymentData.paymentStatus),
            "Paid Amount": String(paymentData.paidAmount)
          }
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create record: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Created payment record for reservation ${paymentData.reservationId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error creating payment record for ${paymentData.reservationId}:`, error.message);
    throw error;
  }
};

/**
 * Update an existing payment record in Teable
 */
const updatePaymentRecord = async (recordId, paymentData) => {
  try {
    const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}/record/${recordId}`;
    
    const recordData = {
      record: {
        fields: {
          "Guest Name": String(paymentData.guestName),
          "Listing Name": String(paymentData.listingName),
          "Arrival Date": String(paymentData.checkInDate),
          "Departure Date": String(paymentData.checkOutDate),
          "Actual Check-in Time": String(paymentData.actualCheckInTime || 'N/A'),
          "Actual Check-out Time": String(paymentData.actualCheckOutTime || 'N/A'),
          "Total Amount ": String(paymentData.totalAmount),
          "Remaining Amount": String(paymentData.remainingAmount),
          "Payment Status": String(paymentData.paymentStatus),
          "Paid Amount": String(paymentData.paidAmount)
        }
      }
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TEABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update record: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Updated payment record for reservation ${paymentData.reservationId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error updating payment record for ${paymentData.reservationId}:`, error.message);
    throw error;
  }
};

/**
 * Delete a payment record from Teable
 */
const deletePaymentRecord = async (recordId) => {
  try {
    const url = `${TEABLE_API_URL}/table/${TEABLE_TABLE_ID}/record/${recordId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TEABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete record: ${response.status}`);
    }

    console.log(`✅ Deleted payment record ${recordId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting payment record ${recordId}:`, error.message);
    throw error;
  }
};

/**
 * Sync payment data from Hostaway to Teable
 * This runs in the background after returning cached data
 */
const syncPaymentDataToTeable = async (hostawayReservations) => {
  try {
    console.log('🔄 Starting background sync to Teable...');
    const startTime = Date.now();

    // Fetch existing records from Teable
    const existingRecords = await fetchAllPaymentRecords();
    
    // Create a map of existing records by reservation ID
    const existingMap = new Map();
    existingRecords.forEach(record => {
      const reservationId = record.fields["Reservation ID "];
      if (reservationId) {
        existingMap.set(reservationId.toString(), record);
      }
    });

    console.log(`📊 Found ${existingRecords.length} existing records in Teable`);
    console.log(`📊 Processing ${hostawayReservations.length} reservations from Hostaway`);

    // Track statistics
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Process each Hostaway reservation
    for (const reservation of hostawayReservations) {
      try {
        const reservationId = reservation.reservationId.toString();
        const existingRecord = existingMap.get(reservationId);

        const paymentData = {
          reservationId: String(reservation.reservationId),
          guestName: String(reservation.guestName),
          listingName: String(reservation.listingName),
          checkInDate: String(reservation.checkInDate),
          checkOutDate: String(reservation.checkOutDate),
          actualCheckInTime: String(reservation.actualCheckInTime || 'N/A'),
          actualCheckOutTime: String(reservation.actualCheckOutTime || 'N/A'),
          totalAmount: String(reservation.totalAmount),
          remainingAmount: String(reservation.remainingAmount),
          paymentStatus: String(reservation.paymentStatus),
          paidAmount: String(reservation.paidAmount)
        };

        if (existingRecord) {
          // Check if data has changed
          const fields = existingRecord.fields;
          const hasChanged = 
            String(fields["Guest Name"]) !== paymentData.guestName ||
            String(fields["Listing Name"]) !== paymentData.listingName ||
            String(fields["Actual Check-in Time"]) !== paymentData.actualCheckInTime ||
            String(fields["Actual Check-out Time"]) !== paymentData.actualCheckOutTime ||
            String(fields["Total Amount "]) !== paymentData.totalAmount ||
            String(fields["Remaining Amount"]) !== paymentData.remainingAmount ||
            String(fields["Payment Status"]) !== paymentData.paymentStatus ||
            String(fields["Paid Amount"]) !== paymentData.paidAmount;

          if (hasChanged) {
            await updatePaymentRecord(existingRecord.id, paymentData);
            updated++;
          } else {
            unchanged++;
          }
        } else {
          // Create new record
          await createPaymentRecord(paymentData);
          created++;
        }

        // Mark this reservation as processed
        existingMap.delete(reservationId);
      } catch (error) {
        console.error(`❌ Error processing reservation ${reservation.reservationId}:`, error.message);
        errors++;
      }
    }

    // Delete records that no longer exist in Hostaway
    let deleted = 0;
    for (const [reservationId, record] of existingMap) {
      try {
        await deletePaymentRecord(record.id);
        console.log(`🗑️ Deleted old record for reservation ${reservationId}`);
        deleted++;
      } catch (error) {
        console.error(`❌ Error deleting record ${reservationId}:`, error.message);
      }
    }

    const syncTime = Date.now() - startTime;
    console.log(`✅ Background sync completed in ${syncTime}ms`);
    console.log(`📊 Sync Statistics:`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Unchanged: ${unchanged}`);
    console.log(`   - Deleted: ${deleted}`);
    console.log(`   - Errors: ${errors}`);

    return {
      success: true,
      created,
      updated,
      unchanged,
      deleted,
      errors,
      syncTime
    };
  } catch (error) {
    console.error('❌ Error syncing payment data to Teable:', error.message);
    throw error;
  }
};

/**
 * Get payment data - returns cached Teable data immediately, then syncs in background
 */
const getPaymentDataFast = async (req, res) => {
  try {
    console.log('⚡ Fast payment data request received');
    const startTime = Date.now();

    // Validate token first
    if (!TEABLE_TOKEN) {
      console.error('❌ TEABLE_TOKEN not configured');
      return res.status(500).json({
        success: false,
        error: 'TEABLE_TOKEN environment variable is not configured'
      });
    }

    // Step 1: Fetch from Teable immediately (fast!)
    console.log('📋 Fetching records from Teable...');
    const teableRecords = await fetchAllPaymentRecords();
    
    // Transform Teable records to frontend format
    const transformedData = teableRecords.map(record => {
      const fields = record.fields;
      return {
        id: record.id,
        reservationId: fields["Reservation ID "],
        guestName: fields["Guest Name"],
        listingName: fields["Listing Name"],
        checkInDate: fields["Arrival Date"],
        checkOutDate: fields["Departure Date"],
        actualCheckInTime: fields["Actual Check-in Time"] || 'N/A',
        actualCheckOutTime: fields["Actual Check-out Time"] || 'N/A',
        totalAmount: parseFloat(fields["Total Amount "]) || 0,
        remainingAmount: parseFloat(fields["Remaining Amount"]) || 0,
        paymentStatus: fields["Payment Status"],
        paidAmount: parseFloat(fields["Paid Amount"]) || 0
      };
    });

    const loadTime = Date.now() - startTime;
    console.log(`⚡ Returned ${transformedData.length} records in ${loadTime}ms`);

    // Step 2: Return data immediately
    res.json({
      success: true,
      data: transformedData,
      loadTime: `${loadTime}ms`,
      source: 'teable-cache',
      message: 'Data loaded from cache, syncing in background...'
    });

    // Step 3: Sync with Hostaway in background (don't wait for this)
    // Import the payment.js function to get fresh Hostaway data
    const payment = require('./payment');
    setImmediate(async () => {
      try {
        console.log('🔄 Starting background Hostaway sync...');
        const hostawayData = await payment.fetchTodayReservationsData();
        await syncPaymentDataToTeable(hostawayData);
        console.log('✅ Background sync completed successfully');
      } catch (error) {
        console.error('❌ Background sync error:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ Error in fast payment data:', error.message);
    console.error('❌ Full error:', error);
    
    // Provide detailed error message
    let errorMessage = error.message;
    if (error.message.includes('TEABLE_TOKEN')) {
      errorMessage = 'Teable authentication token is not configured. Please check environment variables.';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Failed to connect to Teable API. Please check network connection.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
};

/**
 * Force full sync - fetches from Hostaway and updates Teable
 */
const forceFullSync = async (req, res) => {
  try {
    console.log('🔄 Force full sync requested');
    const startTime = Date.now();

    // Fetch fresh data from Hostaway
    const payment = require('./payment');
    const hostawayData = await payment.fetchTodayReservationsData();

    // Sync to Teable
    const syncResult = await syncPaymentDataToTeable(hostawayData);

    // Fetch updated data from Teable
    const teableRecords = await fetchAllPaymentRecords();
    
    const transformedData = teableRecords.map(record => {
      const fields = record.fields;
      return {
        id: record.id,
        reservationId: fields["Reservation ID "],
        guestName: fields["Guest Name"],
        listingName: fields["Listing Name"],
        checkInDate: fields["Arrival Date"],
        checkOutDate: fields["Departure Date"],
        actualCheckInTime: fields["Actual Check-in Time"] || 'N/A',
        actualCheckOutTime: fields["Actual Check-out Time"] || 'N/A',
        totalAmount: parseFloat(fields["Total Amount "]) || 0,
        remainingAmount: parseFloat(fields["Remaining Amount"]) || 0,
        paymentStatus: fields["Payment Status"],
        paidAmount: parseFloat(fields["Paid Amount"]) || 0
      };
    });

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      data: transformedData,
      syncResult,
      totalTime: `${totalTime}ms`,
      source: 'hostaway-fresh'
    });

  } catch (error) {
    console.error('❌ Error in force full sync:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create Express router
const express = require('express');
const router = express.Router();

/**
 * GET /api/payment-teable/fast
 * Get payment data fast from Teable cache, then sync in background
 */
router.get('/fast', getPaymentDataFast);

/**
 * POST /api/payment-teable/sync
 * Force full sync from Hostaway to Teable
 */
router.post('/sync', forceFullSync);

/**
 * GET /api/payment-teable/records
 * Get all payment records from Teable
 */
router.get('/records', async (req, res) => {
  try {
    const records = await fetchAllPaymentRecords();
    res.json({
      success: true,
      data: records,
      total: records.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
