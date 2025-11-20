const axios = require('axios');

// Get Teable configuration from environment variables
const TEABLE_RESERVATIONS_URL = process.env.TEABLE_DUBAI_RESERVATIONS_TABLE_URL;
const TEABLE_REVENUE_TOKEN = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN;

/**
 * Sync Dubai reservations to Teable database
 * Logic:
 * 1. Fetch current reservations from Hostaway (passed as parameter)
 * 2. Fetch existing records from Teable
 * 3. DELETE records not in current Hostaway fetch
 * 4. PATCH existing records with updated data
 * 5. POST new records
 */
async function syncDubaiReservationsToTeable(currentReservations) {
  try {
    console.log(`\n📋 ========== SYNCING DUBAI RESERVATIONS TO TEABLE ==========`);
    console.log(`📊 Current reservations from Hostaway: ${currentReservations.length}`);
    
    if (!TEABLE_RESERVATIONS_URL || !TEABLE_REVENUE_TOKEN) {
      console.error('❌ Teable configuration missing');
      console.error('   TEABLE_RESERVATIONS_URL:', TEABLE_RESERVATIONS_URL);
      console.error('   TEABLE_REVENUE_TOKEN:', TEABLE_REVENUE_TOKEN ? 'SET' : 'NOT SET');
      throw new Error('Teable configuration not found in environment variables');
    }

    // Ensure Bearer prefix is correct
    const finalToken = TEABLE_REVENUE_TOKEN.startsWith('Bearer ') ? TEABLE_REVENUE_TOKEN : `Bearer ${TEABLE_REVENUE_TOKEN}`;
    console.log(`🔐 Using Teable URL: ${TEABLE_RESERVATIONS_URL}`);
    console.log(`🔐 Using token: ${finalToken.substring(0, 30)}...`);

    // Step 1: Fetch all existing records from Teable
    console.log(`\n🔍 Fetching existing records from Teable...`);
    let existingRecords = [];
    try {
      const getResponse = await axios.get(TEABLE_RESERVATIONS_URL, {
        headers: {
          'Authorization': finalToken,
          'Content-Type': 'application/json'
        }
      });
      existingRecords = getResponse.data.records || [];
      console.log(`✅ Found ${existingRecords.length} existing records in Teable`);
    } catch (getError) {
      console.log(`⚠️ Could not fetch existing records (first sync?):`, getError.message);
      existingRecords = [];
    }

    // Step 2: Create a map of current reservation IDs
    const currentReservationIds = new Set(
      currentReservations.map(r => String(r.reservationId || r.id))
    );
    console.log(`\n📌 Current Hostaway reservation IDs:`, Array.from(currentReservationIds));

    // Step 3: Identify records to DELETE (exist in Teable but not in current Hostaway fetch)
    const recordsToDelete = existingRecords.filter(record => {
      // Try both field names (with and without trailing space)
      const reservationId = String(record.fields['Reservation ID '] || record.fields['Reservation ID'] || '');
      return !currentReservationIds.has(reservationId);
    });
    
    console.log(`\n🗑️  Records to DELETE: ${recordsToDelete.length}`);
    if (recordsToDelete.length > 0) {
      recordsToDelete.forEach(record => {
        const resId = record.fields['Reservation ID '] || record.fields['Reservation ID'] || 'N/A';
        console.log(`   - Reservation ID: ${resId}`);
      });
    }

    // Step 4: Delete records not in current fetch (with error handling)
    for (const record of recordsToDelete) {
      try {
        await axios.delete(`${TEABLE_RESERVATIONS_URL}/${record.id}`, {
          headers: {
            'Authorization': finalToken,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ Deleted record: ${record.id}`);
      } catch (deleteError) {
        // Only warn if it's not a 404 (already deleted)
        if (deleteError.response?.status !== 404) {
          console.warn(`⚠️ Could not delete record ${record.id}:`, deleteError.message);
        } else {
          console.log(`ℹ️ Record already deleted: ${record.id}`);
        }
      }
    }

    // Step 5: Process current reservations (PATCH or POST)
    console.log(`\n📝 Processing ${currentReservations.length} current reservations...`);
    
    const results = {
      patched: 0,
      posted: 0,
      deleted: recordsToDelete.length,
      errors: 0
    };

    for (const reservation of currentReservations) {
      try {
        const reservationData = formatReservationData(reservation);
        
        // Find if this reservation already exists in Teable
        // Check both 'Reservation ID' and 'Reservation ID ' (with trailing space)
        const existingRecord = existingRecords.find(record => {
          const recordId = String(record.fields['Reservation ID '] || record.fields['Reservation ID'] || '');
          return recordId === String(reservation.id);
        });

        if (existingRecord) {
          // PATCH existing record
          const patchPayload = {
            record: {
              fields: reservationData
            }
          };

          await axios.patch(
            `${TEABLE_RESERVATIONS_URL}/${existingRecord.id}`,
            patchPayload,
            {
              headers: {
                'Authorization': finalToken,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(`✅ PATCHED reservation ${reservation.id}`);
          results.patched++;
        } else {
          // POST new record
          const postPayload = {
            records: [
              {
                fields: reservationData
              }
            ]
          };

          await axios.post(
            TEABLE_RESERVATIONS_URL,
            postPayload,
            {
              headers: {
                'Authorization': finalToken,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(`✅ POSTED new reservation ${reservation.id}`);
          results.posted++;
        }
      } catch (error) {
        console.error(`❌ Error processing reservation ${reservation.id}:`, error.message);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   URL: ${error.config?.url}`);
          console.error(`   Data:`, error.response.data);
        }
        results.errors++;
      }
    }

    console.log(`\n📊 SYNC SUMMARY:`);
    console.log(`   ✅ Patched: ${results.patched}`);
    console.log(`   ✅ Posted: ${results.posted}`);
    console.log(`   🗑️  Deleted: ${results.deleted}`);
    console.log(`   ❌ Errors: ${results.errors}`);
    console.log(`📋 ========== SYNC COMPLETE ==========\n`);

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error(`❌ Error syncing reservations:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

/**
 * Format reservation data for Teable storage
 * Maps transformed reservation object to Teable field names
 */
function formatReservationData(reservation) {
  // Format dates to ISO 8601 (YYYY-MM-DD)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch (e) {
      return dateStr;
    }
  };
  
  return {
    'Reservation ID ': String(reservation.reservationId || reservation.id || ''),
    'Guest Name': String(reservation.guestName || ''),
    'Listing Name': String(reservation.listingName || ''),
    'Arrival Date': formatDate(reservation.arrivalDate),
    'Departure Date': formatDate(reservation.departureDate),
    'Total Amount ': String(Math.round(parseFloat(reservation.totalAmount || 0) * 100) / 100),
    'Paid Amount': String(Math.round(parseFloat(reservation.paidAmount || 0) * 100) / 100),
    'Remaining Amount': String(Math.round(parseFloat(reservation.remainingAmount || 0) * 100) / 100),
    'Payment Status': String(reservation.paymentStatus || ''),
    'Reservation Status': String(reservation.reservationStatus || '')
  };
}

module.exports = {
  syncDubaiReservationsToTeable,
  formatReservationData
};
