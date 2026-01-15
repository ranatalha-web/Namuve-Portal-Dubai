// Charge Teable API Integration
// This file handles syncing charges to Teable database

const TEABLE_API_URL = "https://teable.namuve.com/api/table/tblKgqxBDkQqk37q0Gl/record";
const TEABLE_RECORDS_URL = "https://teable.namuve.com/api/table/tblKgqxBDkQqk37q0Gl/records";
const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

/**
 * Get all existing records from Teable
 */
export const getAllTeableRecords = async () => {
    try {
        const response = await fetch(TEABLE_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch records: ${response.status}`);
        }

        const data = await response.json();
        return data.records || [];
    } catch (error) {
        console.error('Error fetching Teable records:', error);
        throw error;
    }
};

/**
 * Delete all existing records from Teable
 */
export const deleteAllTeableRecords = async () => {
    try {
        console.log('Fetching all existing records to delete...');
        const records = await getAllTeableRecords();

        if (records.length === 0) {
            console.log('No records to delete');
            return;
        }

        console.log(`Deleting ${records.length} existing records...`);

        // Delete records one by one
        for (const record of records) {
            await fetch(`${TEABLE_API_URL}/${record.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${TEABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        console.log(`Successfully deleted ${records.length} records`);
    } catch (error) {
        console.error('Error deleting Teable records:', error);
        throw error;
    }
};

/**
 * Post charges to Teable database
 * @param {Array} charges - Array of charge objects
 */
export const postChargesToTeable = async (charges) => {
    try {
        console.log(`Posting ${charges.length} charges to Teable...`);

        // Post each charge individually
        for (const charge of charges) {
            // Teable API expects { records: [ { fields: ... } ] } structure
            const recordPayload = {
                records: [{
                    fields: {
                        "Reservation ID": String(charge.reservationId || ""),
                        "Status": String(charge.charges[0]?.status || ""),
                        "Charge Date ": String(charge.charges[0]?.chargeDate || ""),
                        "Charge ID ": String(charge.charges[0]?.chargeId || ""),
                        "Amount": String(charge.charges[0]?.amount || "0"),
                        "Charge Name": String(charge.charges[0]?.chargeName || ""),
                        "Type": String(charge.charges[0]?.type || "")
                    }
                }]
            };

            const response = await fetch(TEABLE_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TEABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recordPayload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to post charge ${charge.charges[0]?.chargeId}: ${response.status}`, errorText);
                throw new Error(`Failed to post record: ${response.status}`);
            }
        }

        console.log(`Successfully posted ${charges.length} charges to Teable`);
    } catch (error) {
        console.error('Error posting charges to Teable:', error);
        throw error;
    }
};

/**
 * Update (PATCH) existing records in Teable
 * @param {Array} charges - Array of charge objects
 */
export const updateTeableRecords = async (charges) => {
    try {
        console.log(`Updating ${charges.length} charges in Teable...`);

        // Get existing records to match IDs
        const existingRecords = await getAllTeableRecords();

        for (let i = 0; i < charges.length && i < existingRecords.length; i++) {
            const charge = charges[i];
            const recordId = existingRecords[i].id;

            const updateData = {
                fields: {
                    "Reservation ID": charge.reservationId || "",
                    "Status": charge.charges[0]?.status || "",
                    "Charge Date": charge.charges[0]?.chargeDate || "",
                    "Charge ID": charge.charges[0]?.chargeId?.toString() || "",
                    "Amount": charge.charges[0]?.amount || 0,
                    "Charge Name": charge.charges[0]?.chargeName || "",
                    "Type": charge.charges[0]?.type || ""
                }
            };

            await fetch(`${TEABLE_API_URL}/${recordId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${TEABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
        }

        console.log(`Successfully updated ${charges.length} charges in Teable`);
    } catch (error) {
        console.error('Error updating Teable records:', error);
        throw error;
    }
};

/**
 * Sync charges to Teable: Delete all existing records, then post new ones
 * @param {Array} charges - Array of charge objects
 */
export const syncChargesToTeable = async (charges) => {
    try {
        console.log('Starting Teable sync...');

        // Step 1: Delete all existing records
        await deleteAllTeableRecords();

        // Step 2: Post new records
        await postChargesToTeable(charges);

        console.log('Teable sync completed successfully!');
    } catch (error) {
        console.error('Error syncing charges to Teable:', error);
        throw error;
    }
};

export default {
    getAllTeableRecords,
    deleteAllTeableRecords,
    postChargesToTeable,
    updateTeableRecords,
    syncChargesToTeable
};
