/**
 * Cron Job: Sync Daily Reservations to Teable
 * Table: tblK85KRxNPjyTL3vcY
 * Schedule: Hourly
 * Strategy: Delete if Exists (Match by Listing Name + Date) -> Post New Record
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const dayjs = require('dayjs');

// Configuration
const TEABLE_ID = "tblK85KRxNPjyTL3vcY";
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";
const TEABLE_API_URL = `https://teable.namuve.com/api/table/${TEABLE_ID}/record`;

const HOSTAWAY_API = "https://api.hostaway.com/v1";
const HOSTAWAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImE0OTkzMDcyMzdiNmQyODA2M2NlYzYwZjUzM2RmYTM1NTU4ZjU0Yzc4OTJhMTk5MmFkZGNhYjZlZWE5NTE1MzFjMDYwM2UzMGI5ZjczZDRhIiwiaWF0IjoxNzM5MjcwMjM2LjA0NzE4LCJuYmYiOjE3MzkyNzAyMzYuMDQ3MTgyLCJleHAiOjIwNTQ4MDMwMzYuMDQ3MTg2LCJzdWIiOiIiLCJzY29wZXMiOlsiZ2VuZXJhbCJdLCJzZWNyZXRJZCI6NTI0OTJ9.n_QTZxeFcJn121EGofg290ReOoNE7vMJAE4-lnXhNbLCZw0mIJu1KQWE5pM0xPUcUHeJ-7XTQfS0U5yIkabGi7vGGex0yx9A0h03fn7ZBAtCzPLq_Xmj8ZOdHzahpRqxRsNRRNOlnbttTSrpSo4NJCdK6yhMTKrKkTTVh60IJIc";

/**
 * Deletes a record by ID with retry logic
 */
const deleteRecord = async (recordId, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(`${TEABLE_API_URL}/${recordId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${TEABLE_TOKEN}`,
                    "Content-Type": "application/json"
                }
            });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            return true;
        } catch (error) {
            if (attempt === retries || error.code !== 'ECONNRESET') {
                console.error(`Failed to delete record ${recordId} after ${attempt} attempts:`, error.message);
                return false;
            }
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Retry ${attempt}/${retries} for delete ${recordId} after ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return false;
};

/**
 * Fetches finance data for a specific reservation ID
 */
const fetchFinanceData = async (reservationId) => {
    try {
        const financeUrl = `${HOSTAWAY_API}/financeStandardField/reservation/${reservationId}`;
        const response = await fetch(financeUrl, {
            headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
        });
        const data = await response.json();
        if (data.status === 'success' && data.result) {
            return data.result.baseRate; // Return the base rate
        }
    } catch (error) {
        console.error(`Error fetching finance for ${reservationId}:`, error.message);
    }
    return null;
};

/**
 * Posts a single day record with retry logic
 */
const postRecord = async (data, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const fields = {
                "Listing Name": String(data.listingName),
                "Available": String(data.status === 'available' ? '1' : '0'),
                "Booked": String(data.status === 'booked' || data.status === 'reserved' ? '1' : '0'),
                "Occupancy": String(data.status === 'booked' || data.status === 'reserved' ? '100%' : '0%'),
                "Reservation IDs": String(data.reservationId || ""),
                "Available Dates": String(data.date),
                "Prices": data.status === 'available' ? String(data.price) : "",
                // New Columns (Mapped strictly to user request)
                "Guest Name ": String(data.guestName || ""),
                "Arrival Date ": String(data.arrivalDate || ""),
                "Departure Date": String(data.departureDate || ""),
                "Noghts": data.nights ? String(data.nights) : "",
                "Base Rate ": data.baseRate ? String(data.baseRate) : "",
                "Price Per Nights": data.pricePerNight ? String(data.pricePerNight) : ""
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
                console.error(`Error posting ${data.listingName} - ${data.date}: ${err}`);
                return null;
            }

            return true;
        } catch (error) {
            if (attempt === retries || error.code !== 'ECONNRESET') {
                console.error(`Error processing ${data.listingName} - ${data.date} after ${attempt} attempts:`, error);
                return null;
            }
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Retry ${attempt}/${retries} for post ${data.listingName} - ${data.date} after ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return null;
};

/**
 * Deletes ALL records from the table (Truncate)
 */
const deleteAllRecords = async () => {
    console.log("⚠️ STARTING FULL TABLE TRUNCATE...");
    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            // 1. Fetch batch of IDs (Reverted to 100 for stability)
            const response = await fetch(`${TEABLE_API_URL}?take=100`, {
                headers: { "Authorization": `Bearer ${TEABLE_TOKEN}` }
            });

            if (!response.ok) {
                console.error(`❌ Failed to fetch records for delete. Status: ${response.status}`);
                // Wait and retry instead of breaking immediately
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            const data = await response.json();
            const records = data.records || [];

            if (records.length === 0) {
                console.log("✅ No more records found. Table is empty.");
                hasMore = false;
                break;
            }

            console.log(`🗑️ Found batch of ${records.length} records to delete...`);

            // 2. Delete them
            // Note: Teable might support batch delete, but we'll stick to single for safety/simplicity unless batch endpoint is known.
            // Actually, querying just IDs is faster if possible, but standard record fetch is fine.

            // To speed up, we can delete in parallel batches
            const deletePromises = records.map(record => deleteRecord(record.id));
            await Promise.all(deletePromises);

            deletedCount += records.length;
            console.log(`Deleted ${deletedCount} records so far...`);

            // Short pause to be gentle
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error("Error during truncate:", error);
            // Don't break immediately, try next loop? Or better to stop to avoid infinite loop
            // If fetch fails, we should probably stop.
            break;
        }
    }
    console.log(`✅ TRUNCATE COMPLETE. Total deleted: ${deletedCount}`);
};

const runJob = async () => {
    console.log("=== CRON: Syncing Daily Reservations to Teable (Truncate & Load) ===");
    try {
        // 1. FETCH HOSTAWAY DATA FIRST (Safe Check)
        // If Hostaway fails, we DO NOT want to delete our existing data.
        console.log("1. Fetching Hostaway Data...");
        const listingsRes = await fetch(`${HOSTAWAY_API}/listings`, {
            headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
        });
        const listingsData = await listingsRes.json();
        const allListings = listingsData.result || [];
        const uaeListings = allListings.filter(l => l.countryCode === 'AE');
        console.log(`Found ${uaeListings.length} UAE listings`);

        if (uaeListings.length === 0) {
            console.warn("No UAE listings found. Aborting sync to preserve data.");
            return;
        }

        // 2. TRUNCATE TABLE
        // Only proceed to delete if we successfully connected to Hostaway
        await deleteAllRecords();

        // 3. PROCESS AND POST
        // 3. PROCESS AND POST
        // Sync Window: First day of current month to Last day of current month
        const startDate = dayjs().startOf('month').format('YYYY-MM-DD');
        const endDate = dayjs().endOf('month').format('YYYY-MM-DD');

        console.log(`📅 Syncing period: ${startDate} to ${endDate}`);

        let createdCount = 0;
        let skippedDuplicates = 0;

        // Strong Duplicate Prevention Set
        // Format: `${listingName}|${date}`
        const processedKeys = new Set();

        for (const listing of uaeListings) {
            try {
                // Fetch Calendar
                const url = `${HOSTAWAY_API}/listings/${listing.id}/calendar?includeResources=1&startDate=${startDate}&endDate=${endDate}`;
                const calRes = await fetch(url, {
                    headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
                });
                const calData = await calRes.json();
                const calendarDays = calData.result || [];

                // Pre-fetch unique reservation details for this calendar batch
                const reservationDetailsMap = new Map();

                // Collect all reservation IDs first
                for (const day of calendarDays) {
                    if (day.reservations && Array.isArray(day.reservations)) {
                        for (const res of day.reservations) {
                            if (res.hostawayReservationId && !reservationDetailsMap.has(res.hostawayReservationId)) {
                                // Fetch Finance Data
                                const baseRate = await fetchFinanceData(res.hostawayReservationId);
                                const nights = res.nights;
                                const pricePerNight = (baseRate && nights) ? (baseRate / nights).toFixed(2) : null;

                                reservationDetailsMap.set(res.hostawayReservationId, {
                                    guestName: res.guestName,
                                    arrivalDate: res.arrivalDate,
                                    departureDate: res.departureDate,
                                    nights: nights,
                                    baseRate: baseRate,
                                    pricePerNight: pricePerNight
                                });
                                // Throttle API format
                                await new Promise(r => setTimeout(r, 100));
                            }
                        }
                    }
                }

                for (const day of calendarDays) {
                    const listingName = listing.internalListingName || listing.name;
                    const date = day.date;
                    const key = `${listingName}|${date}`;

                    // --- STRONG DUPLICATE CHECK ---
                    if (processedKeys.has(key)) {
                        // We have already processed this Listing+Date combination in this run
                        // This handles if Hostaway returns duplicate days or overlapping data
                        skippedDuplicates++;
                        continue;
                    }
                    processedKeys.add(key);

                    // Extract Reservation Info
                    let firstResId = null;
                    let resInfo = {};

                    if (day.reservations && Array.isArray(day.reservations)) {
                        for (const res of day.reservations) {
                            if (res.hostawayReservationId) {
                                firstResId = res.hostawayReservationId;
                                if (reservationDetailsMap.has(firstResId)) {
                                    resInfo = reservationDetailsMap.get(firstResId);
                                }
                                break;
                            }
                        }
                    }

                    const recordData = {
                        listingName,
                        date: date,
                        price: day.price,
                        status: day.status,
                        reservationId: firstResId,
                        // Spread details
                        guestName: resInfo.guestName,
                        arrivalDate: resInfo.arrivalDate,
                        departureDate: resInfo.departureDate,
                        nights: resInfo.nights,
                        baseRate: resInfo.baseRate,
                        pricePerNight: resInfo.pricePerNight
                    };

                    // DIRECT POST (No check for existing, because we wiped the table)
                    await postRecord(recordData);
                    createdCount++;

                    // Throttle Teable
                    await new Promise(r => setTimeout(r, 200));
                }

            } catch (err) {
                console.error(`Error processing listing ${listing.id}:`, err);
            }
        }

        console.log(`Sync Complete. Created New: ${createdCount}, Skipped Duplicates: ${skippedDuplicates}`);

    } catch (error) {
        console.error("Critical Error in Cron Job:", error);
    }
};

// Export handler for Express/Vercel
const handler = async (req, res) => {
    console.log("=== Triggering Teable Reservations Sync ===");
    try {
        await runJob();
        if (res) {
            res.status(200).json({ success: true, message: "Job executed successfully" });
        }
    } catch (error) {
        console.error("Handler Error:", error);
        if (res) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

// Allow running directly with `node backend/api/teable-reservations.js`
if (require.main === module) {
    runJob().then(() => {
        console.log("✅ Manual execution complete.");
        process.exit(0);
    }).catch(err => {
        console.error("❌ Manual execution failed:", err);
        process.exit(1);
    });
}

module.exports = handler;
