// Quick test script for Dubai Listing Revenue API
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/dubai-listing-revenue';

async function testAPI() {
    console.log('🧪 Testing Dubai Listing Revenue API...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data.message);
        console.log('');

        // Test 2: Debug Configuration
        console.log('2️⃣ Testing Debug Configuration...');
        const debugResponse = await axios.get(`${BASE_URL}/debug`);
        console.log('🔍 Configuration:');
        console.log('   - Base URL:', debugResponse.data.config.baseURL);
        console.log('   - Auth Token Configured:', debugResponse.data.config.authTokenConfigured);
        console.log('   - Auth Token Length:', debugResponse.data.config.authTokenLength);
        console.log('   - Auth Token Prefix:', debugResponse.data.config.authTokenPrefix);
        console.log('   - Exchange Rate API:', debugResponse.data.config.exchangeRateAPI);
        console.log('   - Exchange Rate Key Configured:', debugResponse.data.config.exchangeRateKeyConfigured);
        console.log('');

        // Test 3: Authentication Test
        console.log('3️⃣ Testing Authentication...');
        const authResponse = await axios.get(`${BASE_URL}/test-auth`);
        console.log('✅ Authentication Test:', authResponse.data.message);
        console.log('   - Status Code:', authResponse.data.data.statusCode);
        console.log('   - Listings Count:', authResponse.data.data.listingsCount);
        console.log('   - Auth Token Used:', authResponse.data.data.authTokenUsed);
        console.log('');

        // Test 4: Today's Revenue (if auth works)
        console.log('4️⃣ Testing Today\'s Revenue...');
        const todayResponse = await axios.get(`${BASE_URL}/today`);
        console.log('✅ Today\'s Revenue:', todayResponse.data.message);
        console.log('');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   - Status:', error.response.status);
            console.error('   - Data:', error.response.data);
        }
        console.log('');
    }
}

// Run the test
testAPI().then(() => {
    console.log('🏁 Test completed!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test script failed:', error.message);
    process.exit(1);
});
