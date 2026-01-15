
import * as XLSX from "xlsx-js-style";

// Configuration
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";
const RESERVATIONS_TABLE_ID = "tblK85KRxNPjyTL3vcY";

const RESERVATIONS_API = `https://teable.namuve.com/api/table/${RESERVATIONS_TABLE_ID}/record`;

/**
 * Fetches all records from a Teable endpoint using take/skip pagination
 */
const fetchAllRecords = async (url) => {
    let allRecords = [];
    let skip = 0;
    const take = 100; // Fetch 100 records per request
    let hasMore = true;

    try {
        while (hasMore) {
            const params = new URLSearchParams({
                take: take.toString(),
                skip: skip.toString()
            });

            console.log(`Fetching ${url} (Skip: ${skip}, Take: ${take})...`);
            const response = await fetch(`${url}?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${TEABLE_TOKEN}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

            const data = await response.json();
            const records = data.records || [];

            if (records.length === 0) {
                hasMore = false; // No more records to fetch
            } else {
                allRecords = [...allRecords, ...records];
                skip += take; // Move to next batch

                // If we got fewer records than requested, we've reached the end
                if (records.length < take) {
                    hasMore = false;
                }
            }
        }

        console.log(`Total records fetched: ${allRecords.length}`);
        return allRecords;
    } catch (error) {
        console.error("Error fetching records:", error);
        alert(`Error fetching data: ${error.message}`);
        return [];
    }
};

/**
 * Downloads the Excel file with the matrix layout
 * Uses ONLY the Reservations table (tblK85KRxNPjyTL3vcY) as the data source
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const downloadExcel = async (startDate, endDate) => {
    console.log(`Starting Excel Download for date range: ${startDate} to ${endDate}`);

    // 1. Fetch Reservation Records
    const reservationRecords = await fetchAllRecords(RESERVATIONS_API);

    console.log(`Fetched ${reservationRecords.length} Reservation Records.`);

    if (reservationRecords.length === 0) {
        alert("No reservation data found.");
        return;
    }

    // 2. Build Listing Set from Reservation Data (filtered by date range)
    const allListings = new Set();
    const allDates = new Set();

    // Map: ListingName -> { dateString: { isBooked, resId, price } }
    const resMap = new Map();

    reservationRecords.forEach(record => {
        const listingName = record.fields["Listing Name"];
        const date = record.fields["Available Dates"];
        const isBooked = record.fields["Booked"] === "1" || record.fields["Booked"] === true;
        const resId = record.fields["Reservation IDs"];
        // Use "Price Per Nights" first (common for bookings), fallback to "Prices" (listing base price)
        const price = record.fields["Price Per Nights"] || record.fields["Prices"];

        // Filter by date range
        if (listingName && date && date >= startDate && date <= endDate) {
            allListings.add(listingName);
            allDates.add(date);

            if (!resMap.has(listingName)) {
                resMap.set(listingName, {});
            }
            resMap.get(listingName)[date] = {
                isBooked,
                resId,
                price: price || 0
            };
        }
    });

    const sortedListings = Array.from(allListings).sort();
    const sortedDates = Array.from(allDates).sort();

    console.log(`Found ${sortedListings.length} unique listings and ${sortedDates.length} dates.`);

    // 3. Build Matrix
    const matrixData = [];

    sortedListings.forEach(listingName => {
        const row = { "Listing Name": listingName };
        const listingResData = resMap.get(listingName) || {};
        let rowTotal = 0; // Total Price (Booked + Available)
        let reservedDays = 0;
        let reservedPriceTotal = 0; // Sum of Booked Prices
        let availableDays = 0;
        let availablePriceTotal = 0;

        sortedDates.forEach(date => {
            const dayData = listingResData[date];
            if (dayData) {
                // ALWAYS show price (whether booked or available)
                const priceValue = parseFloat(dayData.price) || 0;
                row[date] = priceValue > 0 ? priceValue : "-";

                if (priceValue > 0) {
                    rowTotal += priceValue; // Always sum all prices for Total Price

                    if (dayData.isBooked) {
                        reservedDays++;
                        reservedPriceTotal += priceValue;
                    } else {
                        availableDays++;
                        availablePriceTotal += priceValue;
                    }
                }
            } else {
                row[date] = "-"; // No data for this date
            }
        });

        // Add Summary Columns
        row["Reserved Days"] = reservedDays > 0 ? reservedDays : "-";

        // "price per night total" (Booked Price Sum) - Previously "Price Per Night Total"
        row["Price per night total"] = reservedPriceTotal > 0 ? reservedPriceTotal : "-";

        row["Available Days"] = availableDays > 0 ? availableDays : "-";

        // "Avaiable Days Price Total" (Available Price Sum) - Previously "Available Price Total"
        row["Avaiable Days Price Total"] = availablePriceTotal > 0 ? availablePriceTotal : "-";

        // "Total Days"
        const totalDays = reservedDays + availableDays;
        row["Total Days"] = totalDays > 0 ? totalDays : "-";

        // "Total Night" (Total Price) - Previously "Total Price"
        row["Total Price"] = rowTotal > 0 ? rowTotal : "-";

        matrixData.push(row);
    });

    // 4. Build Reservation Details Sheet (only for reservations within date range)
    const reservationDetailsMap = new Map(); // ResID -> details
    const reservationDetailsData = [];

    reservationRecords.forEach(record => {
        const resId = record.fields["Reservation IDs"];
        const date = record.fields["Available Dates"];

        // Only include reservations that have at least one date within the selected range
        if (resId && date && date >= startDate && date <= endDate && !reservationDetailsMap.has(resId)) {
            reservationDetailsMap.set(resId, {
                "Reservation": resId,
                "Listing Name": record.fields["Listing Name"] || "",
                "Guest Name": record.fields["Guest Name "] || "",
                "Arrival Date": record.fields["Arrival Date "] || "",
                "Departure Date": record.fields["Departure Date"] || "",
                "Nights": record.fields["Noghts"] || "",
                "Base Rate": record.fields["Base Rate "] || "",
                "Price Per Night": record.fields["Price Per Nights"] || ""
            });
        }
    });

    // Convert to array for sheet
    reservationDetailsMap.forEach(details => {
        reservationDetailsData.push(details);
    });

    // 5. Generate Excel with 2 sheets
    // Sheet 1: Reservations Matrix
    const ws1 = XLSX.utils.json_to_sheet(matrixData);

    // Add hyperlinks to Booked Cells in Sheet 1 using coordinate mapping
    // We iterate listings (Rows) and dates (Cols) to find cells that correspond to booked dates
    sortedListings.forEach((listingName, rowIndex) => {
        const listingResData = resMap.get(listingName) || {};

        sortedDates.forEach((date, colIndex) => {
            const dayData = listingResData[date];
            if (dayData && dayData.isBooked && dayData.resId) {
                // Calculate Cell Address
                // Row: Header (0) + rowIndex + 1 = rowIndex + 1
                // Col: "Listing Name" (0) + colIndex + 1 = colIndex + 1

                const R = rowIndex + 1;
                const C = colIndex + 1;

                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws1[cellAddress];

                if (cell) {
                    // Find the row in Sheet 2 for this reservation
                    const detailsIndex = reservationDetailsData.findIndex(d => d["Reservation"] === dayData.resId);

                    if (detailsIndex !== -1) {
                        // Create hyperlink to Sheet 2
                        const targetRow = detailsIndex + 2; // +2 because Excel is 1-indexed and has header
                        cell.l = {
                            Target: `#'Reservation Details'!A${targetRow}`,
                            Tooltip: `View details for ${dayData.resId}`
                        };

                        // Style: Black + Underline to indicate clickable
                        if (!cell.s) cell.s = {};
                        cell.s.font = { color: { rgb: "000000" }, underline: true };
                    }
                }
            }
        });
    });

    const wscols1 = [
        { wch: 30 }, // Listing Name
        ...sortedDates.map(() => ({ wch: 15 })), // Dates
        { wch: 15 }, // Reserved Days
        { wch: 20 }, // price per night total
        { wch: 15 }, // Available Days
        { wch: 25 }, // Avaiable Days Price Total
        { wch: 15 }, // Total Days
        { wch: 15 }  // Total Night
    ];
    ws1['!cols'] = wscols1;

    // Make header row bold in Sheet 1
    const headerRange1 = XLSX.utils.decode_range(ws1['!ref']);
    for (let C = headerRange1.s.c; C <= headerRange1.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws1[cellAddress]) continue;

        const cellValue = ws1[cellAddress].v;
        const style = { font: { bold: true } };

        if (cellValue === "Price Per Night Total" || cellValue === "Total Days") {
            style.alignment = { wrapText: true };
        }

        ws1[cellAddress].s = style;
    }

    // Sheet 2: Reservation Details
    const ws2 = XLSX.utils.json_to_sheet(reservationDetailsData);



    const wscols2 = [
        { wch: 15 }, // Reservation
        { wch: 30 }, // Listing Name
        { wch: 25 }, // Guest Name
        { wch: 15 }, // Arrival Date
        { wch: 15 }, // Departure Date
        { wch: 10 }, // Nights
        { wch: 15 }, // Base Rate
        { wch: 15 }  // Price Per Night
    ];
    ws2['!cols'] = wscols2;

    // Make header row bold in Sheet 2
    const headerRange2 = XLSX.utils.decode_range(ws2['!ref']);
    for (let C = headerRange2.s.c; C <= headerRange2.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws2[cellAddress]) continue;
        ws2[cellAddress].s = {
            font: { bold: true }
        };
    }

    // Create workbook with both sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Reservations Matrix");
    XLSX.utils.book_append_sheet(wb, ws2, "Reservation Details");

    // 6. Download
    const filename = `Reservations_Matrix_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    console.log(`Downloaded ${filename} with ${sortedListings.length} listings and ${reservationDetailsData.length} reservation details.`);
};
