#!/usr/bin/env node

/**
 * Password Decryption Terminal Tool
 * 
 * This tool allows you to decrypt passwords from the password history
 * using a one-time key for security.
 * 
 * Usage:
 *   node backend/tools/decryptPassword.js
 * 
 * Then follow the prompts to:
 * 1. Enter username/email
 * 2. Request a one-time key
 * 3. Enter the one-time key
 * 4. View the decrypted password
 */

const readline = require('readline');
const axios = require('axios');
// Load environment variables (including .env.local for sensitive keys)
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Helper to ask questions
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Main function
async function main() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🔐 Password Decryption Tool (One-Time Key)       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Strict Security Check: Block execution on production servers
    // Allow ONLY on local development machines (Windows/macOS with development environment)

    // Check 1: Platform must be Windows or macOS
    const allowedPlatforms = ['win32', 'darwin'];
    if (!allowedPlatforms.includes(process.platform)) {
        console.log('🛑 SECURITY ALERT: This tool is BLOCKED on this server.');
        console.log('Reason: Decryption is only allowed on LOCAL development machines.');
        console.log('Your OS: ' + process.platform);
        console.log('Allowed platforms: Windows (win32), macOS (darwin)');
        process.exit(1);
    }

    // Check 2: Must be in development environment (not production)
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
        console.log('🛑 SECURITY ALERT: This tool is BLOCKED in production environment.');
        console.log('Reason: Decryption is only allowed on LOCAL development machines.');
        console.log('Current NODE_ENV: ' + nodeEnv);
        console.log('This tool will NOT run on production servers (Vercel, Digital Ocean, etc.)');
        process.exit(1);
    }

    console.log('✅ Security check passed: Running on local development machine');
    console.log(`   Platform: ${process.platform}, Environment: ${nodeEnv}\n`);

    try {
        // Step 1: Get username
        const username = await question('Enter username or email: ');

        if (!username.trim()) {
            console.log('❌ Username is required!');
            rl.close();
            return;
        }

        console.log('\n📡 Requesting one-time decryption key...\n');

        // Step 2: Request one-time key from API
        let oneTimeKeyData;
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/request-decryption-key`, {
                username: username.trim()
            });

            if (!response.data.success) {
                console.log(`❌ Error: ${response.data.message}`);
                rl.close();
                return;
            }

            oneTimeKeyData = response.data;

            console.log('✅ One-time key generated successfully!\n');
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log(`║  🔑 ONE-TIME KEY: ${oneTimeKeyData.key}  ║`);
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log(`\n⏰ Expires: ${oneTimeKeyData.expiresIn}`);
            console.log('⚠️  This key can only be used ONCE!\n');

        } catch (error) {
            console.log('\n❌ Failed to request decryption key\n');

            if (error.code === 'ECONNREFUSED') {
                console.log('💡 Error: Cannot connect to backend server');
                console.log(`   Make sure the server is running at: ${API_BASE_URL}`);
                console.log('   Run: npm start (in the main project directory)\n');
            } else if (error.response?.status === 400 || error.response?.status === 404) {
                console.log(`💡 Error: ${error.response.data.message || 'User not found'}`);
                console.log('   Please check that the username or email exists in the database\n');
            } else if (error.response?.data?.message) {
                console.log(`💡 Error: ${error.response.data.message}\n`);
            } else {
                console.log(`💡 Error: ${error.message}\n`);
            }

            rl.close();
            return;
        }

        // Step 3: Ask user to enter the key
        const enteredKey = await question('\nEnter the one-time key to decrypt password: ');

        if (!enteredKey.trim()) {
            console.log('❌ Key is required!');
            rl.close();
            return;
        }

        console.log('\n🔓 Decrypting password...\n');

        // Step 4: Decrypt password using the key
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/decrypt-password`, {
                username: username.trim(),
                oneTimeKey: enteredKey.trim()
            });

            if (!response.data.success) {
                console.log(`❌ Error: ${response.data.message}`);
                rl.close();
                return;
            }

            // Display the decrypted password
            console.log('✅ Password decrypted successfully!\n');
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log(`║  Username: ${username.trim().padEnd(42)} ║`);
            console.log(`║  Password: ${response.data.password.padEnd(42)} ║`);
            console.log('╚════════════════════════════════════════════════════════╝\n');
            console.log('⚠️  The one-time key has been consumed and cannot be reused.');
            console.log('⚠️  Please keep this password secure!\n');

        } catch (error) {
            console.log('\n❌ Failed to decrypt password\n');

            if (error.response?.status === 400) {
                console.log(`💡 Error: ${error.response.data.message || 'Invalid or expired one-time key'}`);
                console.log('   The key may have expired or already been used');
                console.log('   Please request a new key and try again\n');
            } else if (error.response?.data?.message) {
                console.log(`💡 Error: ${error.response.data.message}\n`);
            } else {
                console.log(`💡 Error: ${error.message}\n`);
            }
        }

    } catch (error) {
        console.log(`\n❌ Unexpected error: ${error.message}`);
    } finally {
        rl.close();
    }
}

// Run the tool
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
