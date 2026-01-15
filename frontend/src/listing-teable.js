// Teable API Configuration for Listings
const TEABLE_API_URL = "https://teable.namuve.com/api/table/tblT8CzlG0kly4kQ9S5/record";
const TEABLE_RECORDS_URL = "https://teable.namuve.com/api/table/tblT8CzlG0kly4kQ9S5/record";
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

// 1. Get All Records
export const getAllTeableListings = async () => {
    try {
        const response = await fetch(TEABLE_API_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${TEABLE_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Teable listings: ${response.statusText}`);
        }

        const data = await response.json();
        return data.records || [];
    } catch (error) {
        console.error("Error fetching Teable listings:", error);
        return [];
    }
};

// 2. Delete All Records
export const deleteAllTeableListings = async () => {
    try {
        const records = await getAllTeableListings();
        console.log(`Found ${records.length} existing listing records to delete`);

        for (const record of records) {
            await fetch(`${TEABLE_API_URL}/${record.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${TEABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        console.log("All existing listing records deleted.");
    } catch (error) {
        console.error("Error deleting Teable listings:", error);
    }
};

// 3. Post Listings to Teable
export const postListingsToTeable = async (listings) => {
    console.log(`Posting ${listings.length} listings to Teable...`);

    for (const listing of listings) {
        // Format String Fields
        const dateStr = listing.availableDates.map(d => d.date).join(", ");
        const priceStr = listing.availableDates.map(d => d.price).join(", ");
        const daysStr = String(listing.availableDates.length);

        const recordPayload = {
            records: [{
                fields: {
                    "Listing Name": String(listing.listingName || ""),
                    "Date ": String(dateStr || ""),
                    "Days": daysStr,
                    "Price": String(priceStr || "")
                }
            }]
        };

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
                console.error(`Failed to post listing ${listing.listingName}: ${response.status} - ${errText}`);
            }
        } catch (error) {
            console.error("Error posting listing to Teable:", error);
        }
    }
    console.log("Listings sync complete!");
};

// 4. Update (Patch) Record - Example Helper
export const updateTeableListing = async (recordId, fields) => {
    try {
        const response = await fetch(`${TEABLE_API_URL}/${recordId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${TEABLE_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ record: { fields } })
        });
        return await response.json();
    } catch (error) {
        console.error("Error patching record:", error);
    }
};

// 5. Main Sync Function
export const syncListingsToTeable = async (listings) => {
    await deleteAllTeableListings();
    await postListingsToTeable(listings);
};
