
const fetch = global.fetch || require('node-fetch');

// Configuration
const HOSTAWAY_API = "https://api.hostaway.com/v1";
const HOSTAWAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImE0OTkzMDcyMzdiNmQyODA2M2NlYzYwZjUzM2RmYTM1NTU4ZjU0Yzc4OTJhMTk5MmFkZGNhYjZlZWE5NTE1MzFjMDYwM2UzMGI5ZjczZDRhIiwiaWF0IjoxNzM5MjcwMjM2LjA0NzE4LCJuYmYiOjE3MzkyNzAyMzYuMDQ3MTgyLCJleHAiOjIwNTQ4MDMwMzYuMDQ3MTg2LCJzdWIiOiIiLCJzY29wZXMiOlsiZ2VuZXJhbCJdLCJzZWNyZXRJZCI6NTI0OTJ9.n_QTZxeFcJn121EGofg290ReOoNE7vMJAE4-lnXhNbLCZw0mIJu1KQWE5pM0xPUcUHeJ-7XTQfS0U5yIkabGi7vGGex0yx9A0h03fn7ZBAtCzPLq_Xmj8ZOdHzahpRqxRsNRRNOlnbttTSrpSo4NJCdK6yhMTKrKkTTVh60IJIc";

// Helper: Get Dates (YYYY-MM-DD)
// Start: Today | End: Same date next month (1 month from today)
const getDates = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    return {
        startDate: today.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0]
    };
};

// 1. Fetch UAE Listings Only
const getListings = async () => {
    try {
        console.log("Fetching Hostaway listings...");
        const response = await fetch(`${HOSTAWAY_API}/listings`, {
            headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
        });
        const data = await response.json();
        const allListings = data.result || [];

        // Filter for UAE only
        const uaeListings = allListings.filter(l => l.countryCode === 'AE');
        console.log(`Found ${uaeListings.length} UAE listings out of ${allListings.length} total`);

        return uaeListings;
    } catch (error) {
        console.error("Error fetching listings:", error);
        return [];
    }
};

// 2. Fetch Calendar for a Listing
const getCalendar = async (listingId, listingName) => {
    const { startDate, endDate } = getDates();
    const url = `${HOSTAWAY_API}/listings/${listingId}/calendar?includeResources=1&startDate=${startDate}&endDate=${endDate}`;

    console.log(`Fetching calendar for ${listingName} (${startDate} to ${endDate})...`);

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const calendarDays = data.result || [];

        console.log(`> Found ${calendarDays.length} days of data for ${listingName}`);

        // Example: Log available days
        const availableCount = calendarDays.filter(d => d.status === 'available').length;
        console.log(`> Available Days: ${availableCount}`);

        return calendarDays;

    } catch (error) {
        console.error(`Error fetching calendar for ${listingName}:`, error.message);
        return [];
    }
};

// Main Execution
const run = async () => {
    const listings = await getListings();
    console.log(`Processing ${listings.length} listings...`);

    for (const listing of listings) {
        await getCalendar(listing.id, listing.internalListingName || listing.name);
    }
    console.log("Done.");
};

// Run if called directly
if (require.main === module) {
    run();
}

module.exports = run;
