/**
 * Dubai Monthly Revenue - Get Records by Date Range
 * Fetches revenue data from database between two dates and calculates total
 */

const express = require('express');
const router = express.Router();

// Ensure fetch is available
let fetch;
try {
    fetch = globalThis.fetch || require('node-fetch');
} catch (error) {
    console.error('❌ Fetch not available');
    throw new Error('Fetch API not available');
}

// Teable Configuration
const TEABLE_TOKEN = process.env.TEABLE_MONTHLY_BEARER_TOKEN || "teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=";
const DAILY_REVENUE_TABLE_ID = "tblgqswZdUmCUeUzgs0"; // Dubai Daily Revenue table
const TEABLE_API_URL = `https://teable.namuve.com/api/table/${DAILY_REVENUE_TABLE_ID}/record`;

/**
 * Fetch all records with pagination
 */
/**
 * Fetch all records with pagination, trying multiple tokens
 */
async function fetchAllRecords(url, primaryToken) {
    let allRecords = [];
    let skip = 0;
    const take = 100;
    let hasMore = true;

    // List of tokens to try (Primary + Env Vars + Hardcoded)
    const tokensToTry = [
        primaryToken,
        "teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=", // User confirmed correct token
        process.env.TEABLE_REVENUE_BEARER_TOKEN,
        process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN
    ].filter(t => t && t.length > 20); // Valid tokens only

    const uniqueTokens = [...new Set(tokensToTry)];
    let activeToken = null;

    // Find a working token first
    console.log(`🔑 Testing ${uniqueTokens.length} tokens for access to ${DAILY_REVENUE_TABLE_ID}...`);

    for (const token of uniqueTokens) {
        try {
            // Test simple fetch
            const testUrl = `${url}?take=1`;
            const response = await fetch(testUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                console.log(`✅ Found working token: ${token.substring(0, 15)}...`);
                activeToken = token;
                break;
            } else {
                const errText = await response.text();
                console.warn(`⚠️ Token ${token.substring(0, 10)}... failed: ${response.status} - ${errText.substring(0, 100)}`);
            }
        } catch (e) {
            console.warn(`⚠️ Token check failed: ${e.message}`);
        }
    }

    if (!activeToken) {
        throw new Error("All provided Teable tokens failed with 401/403 Unauthorized. Please check Table ID and Token permissions.");
    }

    // Use the working token for pagination
    while (hasMore) {
        const params = new URLSearchParams({
            take: take.toString(),
            skip: skip.toString()
        });

        const response = await fetch(`${url}?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to fetch: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const records = data.records || [];

        if (records.length === 0) {
            hasMore = false;
        } else {
            allRecords = [...allRecords, ...records];
            skip += take;

            if (records.length < take) {
                hasMore = false;
            }
        }
    }

    return allRecords;
}

/**
 * GET /api/dubai-monthly-revenue/date-range
 * Get revenue records between two dates and calculate total
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 */
router.get('/date-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Validate dates
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Both startDate and endDate are required (format: YYYY-MM-DD)'
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Ensure startDate is before endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        console.log(`📅 Fetching revenue records from ${startDate} to ${endDate}...`);

        // Fetch all records from Teable
        const allRecords = await fetchAllRecords(TEABLE_API_URL, TEABLE_TOKEN);
        console.log(`📦 Total records fetched: ${allRecords.length}`);

        // Filter records by date range
        const filteredRecords = allRecords.filter(record => {
            const recordDateRaw = record.fields['Date and Time'] || record.fields['Date'];
            if (!recordDateRaw) return false;

            // Handle Date format (it might be full ISO string)
            const recordDate = String(recordDateRaw).substring(0, 10); // Extract YYYY-MM-DD
            return recordDate >= startDate && recordDate <= endDate;
        });

        console.log(`✅ Filtered to ${filteredRecords.length} records in date range`);

        // Calculate totals
        let totalRevenue = 0;
        let totalReservations = 0;
        const revenueByDate = {};
        const revenueByListing = {};

        filteredRecords.forEach(record => {
            const fields = record.fields;
            const date = String(fields['Date and Time'] || fields['Date'] || '').substring(0, 10);
            const listingName = fields['Listing Name'] || fields['Listing'] || 'Unknown';
            const revenue = parseFloat(fields['Monthly Revenue Actual'] || fields['Revenue'] || 0);
            const reservations = parseInt(fields['Reservations'] || 0);

            // Add to totals
            totalRevenue += revenue;
            totalReservations += reservations;

            // Group by date
            if (!revenueByDate[date]) {
                revenueByDate[date] = {
                    date: date,
                    revenue: 0,
                    reservations: 0,
                    listings: []
                };
            }
            revenueByDate[date].revenue += revenue;
            revenueByDate[date].reservations += reservations;
            revenueByDate[date].listings.push(listingName);

            // Group by listing
            if (!revenueByListing[listingName]) {
                revenueByListing[listingName] = {
                    listingName: listingName,
                    revenue: 0,
                    reservations: 0,
                    dates: []
                };
            }
            revenueByListing[listingName].revenue += revenue;
            revenueByListing[listingName].reservations += reservations;
            revenueByListing[listingName].dates.push(date);
        });

        // Convert to arrays and sort
        const dailyBreakdown = Object.values(revenueByDate).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        const listingBreakdown = Object.values(revenueByListing).sort((a, b) =>
            b.revenue - a.revenue
        );

        // Response
        res.json({
            success: true,
            dateRange: {
                startDate,
                endDate,
                days: filteredRecords.length > 0 ? Object.keys(revenueByDate).length : 0
            },
            totals: {
                revenue: totalRevenue,
                reservations: totalReservations,
                averageRevenuePerDay: dailyBreakdown.length > 0
                    ? (totalRevenue / dailyBreakdown.length).toFixed(2)
                    : 0,
                averageRevenuePerReservation: totalReservations > 0
                    ? (totalRevenue / totalReservations).toFixed(2)
                    : 0
            },
            dailyBreakdown,
            listingBreakdown,
            recordCount: filteredRecords.length
        });

    } catch (error) {
        console.error('❌ Error fetching date range revenue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue data',
            error: error.message
        });
    }
});

/**
 * GET /api/dubai-monthly-revenue/current-month
 * Get revenue for the current month (from 1st to today)
 */
router.get('/current-month', async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');

        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${day}`;

        console.log(`📅 Fetching current month revenue: ${startDate} to ${endDate}`);

        // Set query params and call date-range handler
        req.query.startDate = startDate;
        req.query.endDate = endDate;

        // Call the date-range handler directly
        const dateRangeHandler = router.stack.find(layer => layer.route && layer.route.path === '/date-range');
        if (dateRangeHandler && dateRangeHandler.route) {
            return dateRangeHandler.route.stack[0].handle(req, res);
        }

    } catch (error) {
        console.error('❌ Error fetching current month revenue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch current month revenue',
            error: error.message
        });
    }
});

module.exports = router;
