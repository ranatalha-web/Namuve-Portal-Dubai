/**
 * Cron Job: Sync Daily Revenue to Teable
 * Schedule: Hourly
 */

const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const dayjs = require('dayjs');

// Configuration
const TEABLE_ID = "tbl35PLPRpVNRZFgPZy";
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";
const TEABLE_API_URL = `https://teable.namuve.com/api/table/${TEABLE_ID}/record`;

const HOSTAWAY_API = "https://api.hostaway.com/v1";
const HOSTAWAY_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImNhYzRlNzlkOWVmZTBiMmZmOTBiNzlkNTEzYzIyZTU1MDhiYWEwNWM2OGEzYzNhNzJhNTU1ZmMzNDI4OTQ1OTg2YWI0NTVjNmJjOWViZjFkIiwiaWF0IjoxNzM2MTY3ODExLjgzNTUyNCwibmJmIjoxNzM2MTY3ODExLjgzNTUyNiwiZXhwIjoyMDUxNzAwNjExLjgzNTUzMSwic3ViIjoiIiwic2NvcGVzIjpbImdlbmVyYWwiXSwic2VjcmV0SWQiOjUzOTUyfQ.Mmqfwt5R4CK5AHwNQFfe-m4PXypLLbAPtzCD7CxgjmagGa0AWfLzPM_panH9fCbYbC1ilNpQ-51KOQjRtaFT3vR6YKEJAUkUSOKjZupQTwQKf7QE8ZbLQDi0F951WCPl9uKz1nELm73V30a8rhDN-97I43FWfrGyqBgt7F8wPkE";

/**
 * Fetches existing records to build a lookup map.
 * Limits to recent 1000 records to check for duplicates.
 * Returns a Map: { "Reservation ID": "Record ID" }
 */
const fetchExistingReservations = async () => {
  try {
    const response = await fetch(`${TEABLE_API_URL}?limit=1000`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TEABLE_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error("Failed to fetch existing existing records");
      return new Map();
    }

    const data = await response.json();
    const records = data.records || [];

    // Build Map of existing Reservation ID -> Record ID
    const existingMap = new Map();
    records.forEach(record => {
      const resId = record.fields["Reservation ID "];
      if (resId) {
        existingMap.set(String(resId), record.id);
      }
    });

    console.log(`[Teable Sync] Loaded ${existingMap.size} existing records for duplicate check.`);
    return existingMap;

  } catch (error) {
    console.error("Error fetching existing records:", error);
    return new Map();
  }
};

/**
 * Posts a single reservation record.
 */
const postReservation = async (reservation) => {
  try {
    // Prepare Payload
    const fields = {
      "Reservation ID ": String(reservation.reservationId),
      "Guest Name ": String(reservation.guestName),
      "Listing Name": String(reservation.listingName),
      "Arrival Date ": String(reservation.checkIn),
      "Departure Date ": String(reservation.checkOut),
      "Nights": String(reservation.nights),
      "Base Rate": Number(reservation.baseRate).toFixed(2),
      "Price per Night": Number(reservation.ratePerNight).toFixed(2),
      "Total Price": Number(reservation.totalPrice).toFixed(2),
      "Channel Name": String(reservation.channelName)
    };

    const postPayload = {
      records: [{
        fields: fields
      }]
    };

    const response = await fetch(TEABLE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TEABLE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postPayload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`Error posting ${reservation.reservationId}: ${err}`);
      return null;
    }

    console.log(`[Teable Sync] Created new record for ${reservation.reservationId}`);
    return true;

  } catch (error) {
    console.error(`Error processing ${reservation.reservationId}:`, error);
    return null;
  }
};

const runJob = async () => {
  console.log("=== CRON: Syncing Revenue Data to Teable ===");
  try {
    const today = dayjs().format("YYYY-MM-DD");
    // Check 60 days ahead
    const endDate = dayjs().add(60, 'days').format("YYYY-MM-DD");

    console.log(`Fetching reservations from ${today} to ${endDate}`);

    // 1. Fetch Reservations
    const resResponse = await fetch(
      `${HOSTAWAY_API}/reservations?includeResources=1&departureDate=${today}&departureDateTo=${endDate}&limit=1000`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!resResponse.ok) throw new Error("Failed to fetch reservations");
    const resData = await resResponse.json();
    let reservations = resData.result || [];

    // 2. Fetch Listings
    const listResponse = await fetch(`${HOSTAWAY_API}/listings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!listResponse.ok) throw new Error("Failed to fetch listings");
    const listData = await listResponse.json();
    const listingsMap = {};
    (listData.result || []).forEach(l => listingsMap[l.id] = l);

    // 3. Filter UAE & Status
    reservations = reservations.filter(r => {
      // UAE Filter
      const listing = listingsMap[r.listingMapId] || {};
      if ((listing.countryCode || "").toUpperCase() !== "AE") return false;

      // Status Filter
      const status = (r.status || "").toLowerCase();
      if (status !== "new" && status !== "modified") return false;

      // Date Filter (Today/Future Stay)
      const arrival = r.arrivalDate;
      const departure = r.departureDate;
      const isWithin = (today >= arrival && today < departure);
      const isDeparture = (today === departure);
      return isWithin || isDeparture;
    });

    console.log(`Found ${reservations.length} matching reservations.`);

    // 4. Load Existing for Duplicates (Map of Res ID -> Record ID)
    const existingMap = await fetchExistingReservations();

    // 5. Process & Sync (Fetch Finance Data)
    let syncedCount = 0;
    let deletedCount = 0;

    for (const reservation of reservations) {

      // Delete if exists
      const resId = String(reservation.id);
      if (existingMap.has(resId)) {
        const recordIdToDelete = existingMap.get(resId);
        console.log(`[Teable Sync] Found existing record ${recordIdToDelete} for Res ${resId}. Deleting...`);

        try {
          await fetch(`${TEABLE_API_URL}/${recordIdToDelete}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${TEABLE_TOKEN}`,
              "Content-Type": "application/json"
            }
          });
          deletedCount++;
        } catch (delErr) {
          console.error(`Error deleting record ${recordIdToDelete}:`, delErr);
        }
      }

      try {
        // Finance Call
        const financeRes = await fetch(
          `${HOSTAWAY_API}/financeStandardField/reservation/${reservation.id}`,
          { headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` } }
        );

        let baseRate = 0;
        if (financeRes.ok) {
          const financeData = await financeRes.json();
          baseRate = parseFloat(financeData.result?.baseRate || 0);
        }

        const listing = listingsMap[reservation.listingMapId] || {};

        // Map to Sync Object
        const syncItem = {
          reservationId: reservation.id,
          guestName: reservation.guestName || "N/A",
          listingName: listing.internalListingName || listing.name || "N/A",
          checkIn: dayjs(reservation.arrivalDate).format("MMM DD, YYYY"),
          checkOut: dayjs(reservation.departureDate).format("MMM DD, YYYY"),
          nights: reservation.nights || 0,
          baseRate: baseRate,
          ratePerNight: (reservation.nights > 0 ? baseRate / reservation.nights : 0),
          totalPrice: parseFloat(reservation.totalPrice || 0),
          channelName: reservation.channelName || "Direct"
        };

        // Always Post New
        await postReservation(syncItem);
        syncedCount++;

      } catch (err) {
        console.error(`Error processing reservation ${reservation.id}`, err);
      }
    }

    console.log(`=== CRON: Sync Complete. Synced (New): ${syncedCount}, Deleted Old: ${deletedCount} ===`);

    return {
      success: true,
      syncedCount,
      deletedCount
    };

  } catch (error) {
    console.error("Cron Job Failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Express route handler for the cron job
 * This function is called when the endpoint is hit
 */
async function cronDubaiRevenueHandler(req, res) {
  try {
    console.log('\n========================================');
    console.log('⏰ CRON JOB TRIGGERED');
    console.log('========================================');
    console.log('📅 Time:', new Date().toISOString());
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

    // Call the revenue sync job
    const result = await runJob();

    if (result.success) {
      console.log('✅ Cron job completed successfully');

      return res.status(200).json({
        success: true,
        message: 'Daily revenue cron job executed successfully',
        cronJob: true,
        data: {
          syncedCount: result.syncedCount,
          deletedCount: result.deletedCount
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('⚠️ Cron job completed with error');

      return res.status(400).json({
        success: false,
        message: 'Daily revenue cron job failed',
        cronJob: true,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Cron job error:', error);

    return res.status(500).json({
      success: false,
      message: 'Daily revenue cron job internal error',
      cronJob: true,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    console.log('\n========================================');
    console.log('⏰ CRON JOB COMPLETED');
    console.log('========================================');
  }
}

module.exports = cronDubaiRevenueHandler;
