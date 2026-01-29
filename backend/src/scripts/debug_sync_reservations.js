
const path = require('path');
const dotenv = require('dotenv');

// Resolve path to backend/.env
const envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');

dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath });

console.log('🌍 Loaded .env from:', envPath);
console.log('🔑 Token check:', process.env.HOSTAWAY_AUTH_TOKEN ? 'Present' : 'MISSING');

const { fetchTodayReservationsData } = require('../../api/dubaiPayment');
const { syncDubaiReservationsToTeable } = require('../../api/dubaiReservationsTeable');

async function runDebugSync() {
    console.log('🚀 Starting Debug Sync...');

    try {
        // 1. Fetch Today's Data
        console.log('1️⃣ Fetching Today\'s Reservations from Hostaway...');
        const todayData = await fetchTodayReservationsData();
        console.log(`✅ Got ${todayData.length} active reservations.`);
        console.log('📋 Active IDs:', todayData.map(r => r.reservationId || r.id));

        // 2. Sync (which includes Delete logic)
        console.log('\n2️⃣ Running Sync Logic (Fetch DB -> Compare -> Delete)...');
        await syncDubaiReservationsToTeable(todayData);

        console.log('\n✅ Debug Sync Complete.');
    } catch (error) {
        console.error('❌ Error during debug sync:', error);
    }
}

runDebugSync();
