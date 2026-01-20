const crypto = require('crypto');
const readline = require('readline');

/**
 * Key Manager - Handles encrypted encryption key decryption
 * 
 * This module decrypts the PASSWORD_ENCRYPTION_KEY from its encrypted form
 * using a master password provided at server startup.
 */
class KeyManager {
    constructor() {
        this.decryptedKey = null;
        this.isInitialized = false;
    }

    /**
     * Decrypt the encrypted key using master password
     */
    decryptKey(encryptedKey, masterPassword) {
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
     * Prompt for master password (only in development)
     */
    async promptForMasterPassword() {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('🔐 Enter master password to decrypt encryption key: ', (password) => {
                rl.close();
                resolve(password);
            });
        });
    }

    /**
     * Initialize the key manager
     * - In development: prompts for master password
     * - In production: uses environment variable
     */
    async initialize() {
        if (this.isInitialized) {
            return this.decryptedKey;
        }

        try {
            // Production: Use plain key from environment (Vercel secrets)
            if (process.env.NODE_ENV === 'production') {
                this.decryptedKey = process.env.PASSWORD_ENCRYPTION_KEY;

                if (!this.decryptedKey) {
                    throw new Error('PASSWORD_ENCRYPTION_KEY not set in production environment');
                }

                this.isInitialized = true;
                console.log('✅ Encryption key loaded from environment variables');
                return this.decryptedKey;
            }

            // Development: Decrypt encrypted key with master password
            const encryptedKey = process.env.PASSWORD_ENCRYPTION_KEY_ENCRYPTED;

            if (!encryptedKey) {
                // Fallback to plain key if encrypted version doesn't exist
                this.decryptedKey = process.env.PASSWORD_ENCRYPTION_KEY;

                if (!this.decryptedKey) {
                    throw new Error('Neither PASSWORD_ENCRYPTION_KEY nor PASSWORD_ENCRYPTION_KEY_ENCRYPTED found');
                }

                console.warn('⚠️  Using plain text encryption key (not encrypted)');
                this.isInitialized = true;
                return this.decryptedKey;
            }

            console.log('\n╔════════════════════════════════════════════════════════╗');
            console.log('║     🔐 Secure Key Decryption Required               ║');
            console.log('╚════════════════════════════════════════════════════════╝\n');

            // Prompt for master password
            const masterPassword = await this.promptForMasterPassword();

            if (!masterPassword) {
                throw new Error('Master password is required');
            }

            // Decrypt the key
            console.log('🔓 Decrypting encryption key...');
            this.decryptedKey = this.decryptKey(encryptedKey, masterPassword);

            this.isInitialized = true;
            console.log('✅ Encryption key decrypted successfully\n');

            return this.decryptedKey;

        } catch (error) {
            console.error('❌ Key initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Get the decrypted key
     */
    getKey() {
        if (!this.isInitialized) {
            throw new Error('KeyManager not initialized. Call initialize() first.');
        }
        return this.decryptedKey;
    }

    /**
     * Check if initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Export singleton instance
module.exports = new KeyManager();
