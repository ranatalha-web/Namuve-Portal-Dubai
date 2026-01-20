#!/usr/bin/env node

/**
 * Encrypt/Decrypt Environment Encryption Key
 * 
 * This tool allows you to encrypt your PASSWORD_ENCRYPTION_KEY with a master password
 * that only you know. The encrypted key is stored in .env.local, and you decrypt it
 * when needed using your master password.
 * 
 * Usage:
 *   node backend/tools/encryptEnvKey.js encrypt   - Encrypt the key
 *   node backend/tools/encryptEnvKey.js decrypt   - Decrypt the key
 *   node backend/tools/encryptEnvKey.js generate  - Generate a new encryption key
 */

const crypto = require('crypto');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper to ask questions
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Hidden password input that works on Windows
function questionSecret(query) {
    return new Promise((resolve) => {
        // Display the prompt
        process.stdout.write(query);

        let password = '';

        // Set raw mode to capture each keypress
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const onData = (char) => {
            // Handle different key presses
            if (char === '\n' || char === '\r' || char === '\u0004') {
                // Enter key pressed
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', onData);
                process.stdout.write('\n');
                resolve(password);
            } else if (char === '\u0003') {
                // Ctrl+C pressed
                process.exit();
            } else if (char === '\u007f' || char === '\b') {
                // Backspace pressed
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    process.stdout.write('\b \b');
                }
            } else {
                // Regular character or pasted text
                // Handle paste (multiple characters at once)
                if (char.length > 1) {
                    // Pasted text - PowerShell echoes it, so we need to clear it
                    // Move cursor back and overwrite with asterisks
                    for (let i = 0; i < char.length; i++) {
                        process.stdout.write('\b');
                    }
                    password += char;
                    process.stdout.write('*'.repeat(char.length));
                } else {
                    // Single character typed
                    password += char;
                    process.stdout.write('*');
                }
            }
        };

        process.stdin.on('data', onData);
    });
}

/**
 * Encrypt a key with a master password using AES-256-GCM
 */
function encryptKey(plainKey, masterPassword) {
    // Derive a 256-bit key from the master password using PBKDF2
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');

    // Generate IV
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Encrypt
    let encrypted = cipher.update(plainKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return salt:iv:authTag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a key with a master password
 */
function decryptKey(encryptedKey, masterPassword) {
    try {
        // Split the encrypted data
        const parts = encryptedKey.split(':');
        if (parts.length !== 4) {
            throw new Error('Invalid encrypted key format');
        }

        const [saltHex, ivHex, authTagHex, encrypted] = parts;

        // Convert hex strings back to buffers
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        // Derive the same key from password and salt
        const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');

        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        // Decrypt
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed - incorrect password or corrupted data');
    }
}

/**
 * Generate a new random encryption key
 */
function generateNewKey() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Read .env.local file
 */
function readEnvLocal() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        return {};
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};

    content.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    });

    return env;
}

/**
 * Write to .env.local file
 */
function writeEnvLocal(key, value) {
    const envPath = path.join(__dirname, '..', '.env.local');
    let content = '';

    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add the key
    const lines = content.split('\n');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${key}=`)) {
            lines[i] = `${key}=${value}`;
            found = true;
            break;
        }
    }

    if (!found) {
        lines.push(`${key}=${value}`);
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
}

/**
 * Main encrypt function
 */
async function encryptCommand() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🔐 Encrypt PASSWORD_ENCRYPTION_KEY               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Read current key
        const env = readEnvLocal();
        const currentKey = env.PASSWORD_ENCRYPTION_KEY;
        const existingEncryptedKey = env.PASSWORD_ENCRYPTION_KEY_ENCRYPTED;

        if (!currentKey) {
            console.log('❌ No PASSWORD_ENCRYPTION_KEY found in .env.local');
            console.log('💡 Run: node backend/tools/encryptEnvKey.js generate\n');
            return;
        }

        console.log('Current key found (64 characters):', currentKey.substring(0, 16) + '...\n');

        // Check if encrypted key already exists (password already set)
        if (existingEncryptedKey) {
            console.log('🔒 Master password is already set.');
            console.log('⚠️  To change it, you must verify the current password first.\n');

            // Verify old password first
            const oldPassword = await questionSecret('Enter current master password: ');

            if (!oldPassword) {
                console.log('❌ Password verification required\n');
                return;
            }

            // Try to decrypt with old password to verify
            try {
                decryptKey(existingEncryptedKey, oldPassword);
                console.log('✅ Password verified\n');
            } catch (error) {
                console.log('❌ Incorrect password! Cannot change master password.\n');
                return;
            }

            console.log('Enter NEW master password:\n');
        }

        // Get master password (hidden input)
        const masterPassword = await questionSecret('Enter your master password (keep this safe!): ');

        if (!masterPassword || masterPassword.trim().length < 8) {
            console.log('❌ Master password must be at least 8 characters\n');
            return;
        }

        // Confirm password (hidden input)
        const confirmPassword = await questionSecret('Confirm master password: ');

        if (masterPassword !== confirmPassword) {
            console.log('❌ Passwords do not match\n');
            return;
        }

        // Encrypt the key
        console.log('\n🔒 Encrypting key with master password...\n');
        const encryptedKey = encryptKey(currentKey, masterPassword);

        // Save encrypted key
        writeEnvLocal('PASSWORD_ENCRYPTION_KEY_ENCRYPTED', encryptedKey);

        console.log('✅ Encryption successful!\n');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  Encrypted key saved to .env.local                    ║');
        console.log('║  Key: PASSWORD_ENCRYPTION_KEY_ENCRYPTED               ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log('⚠️  IMPORTANT: Keep your master password safe!');
        console.log('⚠️  Without it, you cannot decrypt the key!\n');
        console.log('💡 To use the encrypted key, run:');
        console.log('   node backend/tools/encryptEnvKey.js decrypt\n');

    } catch (error) {
        console.log(`\n❌ Error: ${error.message}\n`);
    } finally {
        rl.close();
    }
}

/**
 * Main decrypt function
 */
async function decryptCommand() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🔓 Decrypt PASSWORD_ENCRYPTION_KEY               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Read encrypted key
        const env = readEnvLocal();
        const encryptedKey = env.PASSWORD_ENCRYPTION_KEY_ENCRYPTED;

        if (!encryptedKey) {
            console.log('❌ No PASSWORD_ENCRYPTION_KEY_ENCRYPTED found in .env.local');
            console.log('💡 Run: node backend/tools/encryptEnvKey.js encrypt\n');
            return;
        }

        console.log('Encrypted key found\n');

        // Get master password (hidden input)
        const masterPassword = await questionSecret('Enter your master password: ');

        if (!masterPassword) {
            console.log('❌ Password is required\n');
            return;
        }

        // Decrypt the key
        console.log('\n🔓 Decrypting key...\n');
        const decryptedKey = decryptKey(encryptedKey, masterPassword);

        console.log('✅ Decryption successful!\n');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log(`║  Decrypted Key: ${decryptedKey.substring(0, 32)}...  ║`);
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log('⚠️  Keep this key secure!');
        console.log('⚠️  This is your actual PASSWORD_ENCRYPTION_KEY\n');

    } catch (error) {
        console.log(`\n❌ Error: ${error.message}\n`);
    } finally {
        rl.close();
    }
}

/**
 * Generate a new encryption key
 */
async function generateCommand() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🔑 Generate New PASSWORD_ENCRYPTION_KEY          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        const newKey = generateNewKey();

        console.log('✅ New encryption key generated!\n');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log(`║  ${newKey}  ║`);
        console.log('╚════════════════════════════════════════════════════════╝\n');

        const save = await question('Save this key to .env.local? (yes/no): ');

        if (save.toLowerCase() === 'yes' || save.toLowerCase() === 'y') {
            writeEnvLocal('PASSWORD_ENCRYPTION_KEY', newKey);
            console.log('\n✅ Key saved to .env.local\n');
            console.log('💡 To encrypt this key with a master password, run:');
            console.log('   node backend/tools/encryptEnvKey.js encrypt\n');
        } else {
            console.log('\n⚠️  Key not saved. Copy it manually if needed.\n');
        }

    } catch (error) {
        console.log(`\n❌ Error: ${error.message}\n`);
    } finally {
        rl.close();
    }
}

/**
 * Main function
 */
async function main() {
    const command = process.argv[2];

    if (!command) {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║     🔐 Encryption Key Management Tool                ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log('Usage:');
        console.log('  node backend/tools/encryptEnvKey.js encrypt   - Encrypt the key');
        console.log('  node backend/tools/encryptEnvKey.js decrypt   - Decrypt the key');
        console.log('  node backend/tools/encryptEnvKey.js generate  - Generate new key\n');
        rl.close();
        return;
    }

    switch (command.toLowerCase()) {
        case 'encrypt':
            await encryptCommand();
            break;
        case 'decrypt':
            await decryptCommand();
            break;
        case 'generate':
            await generateCommand();
            break;
        default:
            console.log(`\n❌ Unknown command: ${command}\n`);
            console.log('Valid commands: encrypt, decrypt, generate\n');
            rl.close();
    }
}

// Run the tool
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
