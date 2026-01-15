// Dubai Listings Availability Cron Job
// Fetches listings from Hostaway, filters for UAE, checks availability for TODAY, and syncs to Teable

// Use global fetch (Node 18+) or fallback
const fetch = global.fetch || require('node-fetch');

// Configuration
const HOSTAWAY_API = "https://api.hostaway.com/v1";
// Note: Ideally, move this token to an environment variable
const HOSTAWAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImE0OTkzMDcyMzdiNmQyODA2M2NlYzYwZjUzM2RmYTM1NTU4ZjU0Yzc4OTJhMTk5MmFkZGNhYjZlZWE5NTE1MzFjMDYwM2UzMGI5ZjczZDRhIiwiaWF0IjoxNzM5MjcwMjM2LjA0NzE4LCJuYmYiOjE3MzkyNzAyMzYuMDQ3MTgyLCJleHAiOjIwNTQ4MDMwMzYuMDQ3MTg2LCJzdWIiOiIiLCJzY29wZXMiOlsiZ2VuZXJhbCJdLCJzZWNyZXRJZCI6NTI0OTJ9.n_QTZxeFcJn121EGofg290ReOoNE7vMJAE4-lnXhNbLCZw0mIJu1KQWE5pM0xPUcUHeJ-7XTQfS0U5yIkabGi7vGGex0yx9A0h03fn7ZBAtCzPLq_Xmj8ZOdHzahpRqxRsNRRNOlnbttTSrpSo4NJCdK6yhMTKrKkTTVh60IJIc";

// Teable Configuration
// Using the singular record endpoint for POST as requested
const TEABLE_API_URL = "https://teable.namuve.com/api/table/tblT8CzlG0kly4kQ9S5/record";
const TEABLE_RECORDS_URL = "https://teable.namuve.com/api/table/tblT8CzlG0kly4kQ9S5/record"; // Using singular as per frontend fix
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

// Helper: Get Today's Date (YYYY-MM-DD)
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// 1. Fetch UAE Listings
const getUaeListings = async () => {
    try {
        console.log("Fetching Hostaway listings...");
        const response = await fetch(`${HOSTAWAY_API}/listings`, {
            headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
        });
        const data = await response.json();
        const listings = data.result || [];

        const uaeListings = listings.filter(l => l.countryCode === 'AE');
        console.log(`Found ${uaeListings.length} UAE listings`);
        return uaeListings;
    } catch (error) {
        console.error("Error fetching listings:", error);
        return [];
    }
};

// 2. Fetch Availability for Each Listing
const getListingsAvailability = async (listings) => {
    console.log("Fetching availability for listings...");
    const today = getTodayDate();

    // We fetch for startDate=today, endDate=today (1 day range)
    const availabilityPromises = listings.map(async (listing) => {
        try {
            const calendarRes = await fetch(
                `${HOSTAWAY_API}/listings/${listing.id}/calendar?startDate=${today}&endDate=${today}`,
                {
                    headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
                }
            );
            const calendarData = await calendarRes.json();
            const calendarDays = calendarData.result || [];

            // Filter for available dates (status === 'available')
            const availableDays = calendarDays.filter(day => day.status === "available");

            return {
                listingId: listing.id,
                listingName: listing.internalListingName || listing.name,
                availableDates: availableDays.map(day => ({
                    date: day.date,
                    price: day.price || 0,
                    currency: listing.currency || "AED"
                }))
            };
        } catch (err) {
            console.error(`Error fetching calendar for listing ${listing.id}:`, err);
            return {
                listingId: listing.id,
                listingName: listing.internalListingName || listing.name,
                availableDates: []
            };
        }
    });

    const results = await Promise.all(availabilityPromises);

    // Filter out listings with NO available dates? 
    // Usually we only show what IS available.
    const availableListings = results.filter(r => r.availableDates.length > 0);
    console.log(`${availableListings.length} listings are available today.`);
    return availableListings;
};

// 3. Sync to Teable
const fetchExistingListings = async () => {
    try {
        const response = await fetch(`${TEABLE_API_URL}?limit=1000`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${TEABLE_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Failed to fetch existing listings");
            return new Map();
        }

        const data = await response.json();
        const records = data.records || [];

        // Build Map of existing Listing Name -> Record ID
        const existingMap = new Map();
        records.forEach(record => {
            const name = record.fields["Listing Name"];
            if (name) {
                existingMap.set(String(name), record.id);
            }
        });

        console.log(`[Teable Sync] Loaded ${existingMap.size} existing records for duplicate check.`);
        return existingMap;

    } catch (error) {
        console.error("Error fetching existing records:", error);
        return new Map();
    }
};

const syncToTeable = async (listings) => {
    console.log(`Starting sync for ${listings.length} listings...`);

    // A. Load Existing Map
    const existingMap = await fetchExistingListings();

    // B. Process Each Listing
    for (const listing of listings) {
        const listName = String(listing.listingName || "");

        // 1. DELETE if exists
        if (existingMap.has(listName)) {
            const recordId = existingMap.get(listName);
            console.log(`[Teable Sync] Found existing record ${recordId} for ${listName}. Deleting...`);
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
        const dateStr = listing.availableDates.map(d => d.date).join(", ");
        // Ensure prices are formatted nicely if needed, but keeping as string list is fine
        const priceStr = listing.availableDates.map(d => Number(d.price).toFixed(2)).join(", ");
        const daysStr = String(listing.availableDates.length);

        const recordPayload = {
            records: [{
                fields: {
                    "Listing Name": listName,
                    "Date ": String(dateStr || ""),
                    "Days": daysStr,
                    "Price": String(priceStr || "")
                }
            }]
        };

        // 3. POST New Record
        try {
            const response = await fetch(TEABLE_RECORDS_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${TEABLE_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(recordPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`Failed to post ${listName}: ${response.status} - ${errText}`);
            } else {
                console.log(`[Teable Sync] Created new record for ${listName}`);
            }
        } catch (e) {
            console.error("Error posting listing:", e);
        }
    }
    console.log("Listings Sync Complete!");
};

// MAIN FUNCTION
const runJob = async () => {
    console.log("Starting Dubai Listings Availability Sync Job...");

    // 1. Get Listings
    const uaeListings = await getUaeListings();

    // 2. Get Availability (Today)
    const availableListings = await getListingsAvailability(uaeListings);

    // 3. Sync
    await syncToTeable(availableListings);
};

// Run if called directly
if (require.main === module) {
    // 1. Run immediately
    runJob();

    // 2. Schedule every hour
    const INTERVAL_MS = 60 * 60 * 1000;
    console.log(`Scheduler started: Running every ${INTERVAL_MS / 1000 / 60} minutes.`);

    setInterval(() => {
        console.log("⏰ Hourly Trigger: Starting Listings sync...");
        runJob();
    }, INTERVAL_MS);
}

module.exports = runJob;
