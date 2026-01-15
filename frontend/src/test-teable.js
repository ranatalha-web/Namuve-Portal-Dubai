import dayjs from "dayjs";

// Configuration
const TEABLE_ID = "tbl35PLPRpVNRZFgPZy";
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";
const TEABLE_API_URL = `https://teable.namuve.com/api/table/${TEABLE_ID}/record`;

/**
 * Fetches existing records to build a lookup map.
 * Limits to recent 1000 records to check for duplicates.
 * Returns a Map: { "Reservation ID": "Record ID" }
 */
const fetchExistingReservations = async () => {
    try {
        const response = await fetch(`${TEABLE_API_URL}?limit=1000`, { // Fetch last 1000 records
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
 * Syncs a single reservation record (Internal helper).
 * Assumes duplications are handled by caller or simple POST.
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

        const data = await response.json();
        const newId = data.records?.[0]?.id || data.id;
        console.log(`[Teable Sync] Created record: ${newId} for Res: ${reservation.reservationId}`);
        return newId;

    } catch (error) {
        console.error(`Error processing ${reservation.reservationId}:`, error);
        return null;
    }
};

/**
 * Batch Sync Function
 * - Fetches existing records ONCE.
 * - Checks Map. If exists -> DELETE.
 * - Posts new records.
 */
export const syncRevenueToTeable = async (revenueData) => {
    console.log(`[Teable Sync] Starting batch sync for ${revenueData.length} items...`);

    // 1. Get Existing Map
    const existingMap = await fetchExistingReservations();

    const results = [];

    // 2. Process
    for (const item of revenueData) {
        const resId = String(item.reservationId);

        // DELETE if exists
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
            } catch (delErr) {
                console.error(`Error deleting record ${recordIdToDelete}:`, delErr);
            }
        }

        // Post new (Always)
        const resultId = await postReservation(item);
        if (resultId) results.push(resultId);
    }

    console.log(`[Teable Sync] Batch complete. Processed ${results.length} records.`);
    return results;
};
