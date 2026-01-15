// Dubai Charges Cron Job
// Fetches charges from Hostaway, filters for UAE/Today, and syncs to Teable

// Use global fetch (Node 18+) or fallback
const fetch = global.fetch || require('node-fetch');

// Configuration
const HOSTAWAY_API = "https://api.hostaway.com/v1";
const HOSTAWAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImE0OTkzMDcyMzdiNmQyODA2M2NlYzYwZjUzM2RmYTM1NTU4ZjU0Yzc4OTJhMTk5MmFkZGNhYjZlZWE5NTE1MzFjMDYwM2UzMGI5ZjczZDRhIiwiaWF0IjoxNzM5MjcwMjM2LjA0NzE4LCJuYmYiOjE3MzkyNzAyMzYuMDQ3MTgyLCJleHAiOjIwNTQ4MDMwMzYuMDQ3MTg2LCJzdWIiOiIiLCJzY29wZXMiOlsiZ2VuZXJhbCJdLCJzZWNyZXRJZCI6NTI0OTJ9.n_QTZxeFcJn121EGofg290ReOoNE7vMJAE4-lnXhNbLCZw0mIJu1KQWE5pM0xPUcUHeJ-7XTQfS0U5yIkabGi7vGGex0yx9A0h03fn7ZBAtCzPLq_Xmj8ZOdHzahpRqxRsNRRNOlnbttTSrpSo4NJCdK6yhMTKrKkTTVh60IJIc";

const TEABLE_API_URL = "https://teable.namuve.com/api/table/tblKgqxBDkQqk37q0Gl/record";
const TEABLE_RECORDS_URL = "https://teable.namuve.com/api/table/tblKgqxBDkQqk37q0Gl/records";
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

// Helper: Get Today's Date (YYYY-MM-DD)
const getTodayDate = () => {
    const today = new Date();
    // Adjust for UTC+5 if needed, or just use UTC date string
    // Assuming simple YYYY-MM-DD format
    return today.toISOString().split('T')[0];
};

// 1. Fetch UAE Listings
const getUaeListingIds = async () => {
    try {
        const response = await fetch(`${HOSTAWAY_API}/listings`, {
            headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
        });
        const data = await response.json();
        const listings = data.result || [];

        const uaeIds = new Set(
            listings
                .filter(l => l.countryCode === 'AE')
                .map(l => l.id)
        );
        console.log(`Found ${uaeIds.size} UAE listings`);
        return uaeIds;
    } catch (error) {
        console.error("Error fetching listings:", error);
        return new Set();
    }
};

// 2. Fetch All Charges (with Pagination)
const getAllCharges = async () => {
    console.log('Fetching ALL guest charges...');
    let allCharges = [];
    const limit = 500;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await fetch(`${HOSTAWAY_API}/guestPayments/charges?limit=${limit}&offset=${offset}`, {
                headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
            });
            const data = await response.json();
            const charges = data.result || [];

            if (charges.length === 0) {
                hasMore = false;
            } else {
                allCharges = [...allCharges, ...charges];
                offset += limit;
                console.log(`Fetched ${charges.length} charges (Total: ${allCharges.length})`);
            }
        } catch (error) {
            console.error(`Error fetching charges at offset ${offset}:`, error);
            hasMore = false;
        }
    }
    return allCharges;
};

// 3. Sync to Teable
// 3. Sync to Teable
const fetchExistingCharges = async () => {
    try {
        const response = await fetch(`${TEABLE_API_URL}?limit=1000`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${TEABLE_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Failed to fetch existing charges");
            return new Map();
        }

        const data = await response.json();
        const records = data.records || [];

        // Build Map of existing Charge ID -> Record ID
        const existingMap = new Map();
        records.forEach(record => {
            const chargeId = record.fields["Charge ID "];
            if (chargeId) {
                existingMap.set(String(chargeId), record.id);
            }
        });

        console.log(`[Teable Sync] Loaded ${existingMap.size} existing records for duplicate check.`);
        return existingMap;

    } catch (error) {
        console.error("Error fetching existing records:", error);
        return new Map();
    }
};

const syncToTeable = async (formattedCharges) => {
    console.log(`Starting sync for ${formattedCharges.length} charges...`);

    // A. Load Existing Map
    const existingMap = await fetchExistingCharges();

    // B. Process Each Charge
    for (const charge of formattedCharges) {
        const chargeId = String(charge.chargeId || "");

        // 1. DELETE if exists
        if (existingMap.has(chargeId)) {
            const recordId = existingMap.get(chargeId);
            console.log(`[Teable Sync] Found existing record ${recordId} for Charge ${chargeId}. Deleting...`);
            try {
                await fetch(`${TEABLE_API_URL}/${recordId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${TEABLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (e) {
                console.error(`Error deleting record ${recordId}:`, e);
            }
        }

        // 2. Format Fields
        const amountStr = parseFloat(charge.amount || 0).toFixed(2);

        const recordPayload = {
            records: [{
                fields: {
                    "Reservation ID": String(charge.reservationId || ""),
                    "Status": String(charge.status || ""),
                    "Charge Date ": String(charge.chargeDate || ""),
                    "Charge ID ": chargeId,
                    "Amount": amountStr,
                    "Charge Name": String(charge.chargeName || ""),
                    "Type": String(charge.type || "")
                }
            }]
        };

        // 3. POST New Record
        try {
            const response = await fetch(TEABLE_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TEABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recordPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`Failed to post charge ${chargeId}: ${response.status} - ${errText}`);
            } else {
                console.log(`[Teable Sync] Created new record for Charge ${chargeId}`);
            }

        } catch (e) {
            console.error("Error posting charge:", e);
        }
    }
    console.log("Sync Complete!");
};

// MAIN FUNCTION
const runJob = async () => {
    console.log("Starting Dubai Charges Sync Job...");

    // 1. Get UAE Listings
    const uaeListingIds = await getUaeListingIds();

    // 2. Get All Charges
    const allCharges = await getAllCharges();

    // 3. Filter Logic
    const todayStr = getTodayDate();
    console.log(`Filtering for Date: ${todayStr}`);

    const filteredCharges = allCharges.filter(charge => {
        // Check Listing
        if (!charge.listingMapId || !uaeListingIds.has(charge.listingMapId)) return false;

        // Check Date
        const cDate = charge.chargeDate || charge.createdAt || "";
        // Simple string check for YYYY-MM-DD
        return cDate.startsWith(todayStr);
    });

    console.log(`Found ${filteredCharges.length} matching charges.`);

    // 4. Format
    const formatted = filteredCharges.map(charge => ({
        reservationId: charge.reservationId,
        status: charge.status,
        chargeDate: charge.chargeDate || charge.createdAt,
        chargeId: charge.id,
        amount: charge.amount,
        chargeName: charge.title || charge.description || charge.name || "Guest Charge",
        type: charge.type
    }));

    // 5. Sync
    if (formatted.length > 0) {
        await syncToTeable(formatted);
    } else {
        console.log("No charges to sync today.");
        // Still might want to clear old records if that's the logic
        await syncToTeable([]);
    }
};

// Run if called directly
if (require.main === module) {
    // 1. Run immediately on start
    runJob();

    // 2. Schedule to run every hour (60 * 60 * 1000 ms)
    const INTERVAL_MS = 60 * 60 * 1000;
    console.log(`Scheduler started: Running every ${INTERVAL_MS / 1000 / 60} minutes.`);

    setInterval(() => {
        console.log("⏰ Hourly Trigger: Starting scheduled sync...");
        runJob();
    }, INTERVAL_MS);
}

module.exports = runJob;
