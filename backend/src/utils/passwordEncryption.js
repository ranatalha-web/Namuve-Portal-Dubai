const crypto = require('crypto');
const argon2 = require('argon2');
const keyManager = require('./keyManager');

/**
 * Password Encryption Service using Argon2
 * Argon2 is the winner of the Password Hashing Competition
 * and provides superior security for password storage
 */
class PasswordEncryption {
    constructor() {
        // Argon2 configuration
        this.argon2Config = {
            type: argon2.argon2id, // Argon2id - best resistance against side-channel and GPU attacks
            memoryCost: 65536,     // 64 MB memory cost
            timeCost: 3,           // 3 iterations
            parallelism: 4,        // 4 parallel threads
            hashLength: 32,        // 32 bytes output
            saltLength: 16         // 16 bytes salt
        };

        // Master encryption key - loaded securely via KeyManager
        // In development: decrypted from PASSWORD_ENCRYPTION_KEY_ENCRYPTED with master password
        // In production: loaded from environment variable
        this.MASTER_KEY = null;

        // Store one-time keys temporarily (in memory only)
        this.oneTimeKeys = new Map();

        // Auto-cleanup old keys after 5 minutes
        setInterval(() => this.cleanupExpiredKeys(), 60000);
    }

    /**
     * Initialize the encryption service with the master key
     * This must be called after keyManager.initialize()
     */
    async initializeKey() {
        try {
            if (keyManager.isReady()) {
                this.MASTER_KEY = keyManager.getKey();
            } else {
                // Fallback to environment variable if KeyManager not initialized
                this.MASTER_KEY = process.env.PASSWORD_ENCRYPTION_KEY || this.generateMasterKey();
            }
        } catch (error) {
            console.error('❌ Failed to initialize encryption key:', error.message);
            this.MASTER_KEY = this.generateMasterKey();
        }
    }

    /**
     * Generate a random master key for fallback
     */
    generateMasterKey() {
        console.warn('⚠️  Generating temporary master key (data will not be decryptable after restart)');
        this.isTemporaryKey = true; // Flag for debugging
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Get the master key (lazy initialization)
     */
    getMasterKey() {
        if (!this.MASTER_KEY) {
            // Try to get from KeyManager first
            if (keyManager.isReady()) {
                this.MASTER_KEY = keyManager.getKey();
            } else {
                // Fallback to environment variable
                this.MASTER_KEY = process.env.PASSWORD_ENCRYPTION_KEY || this.generateMasterKey();
            }
        }
        return this.MASTER_KEY;
    }

    /**
     * Encrypt a password using Argon2id
     * @param {string} password - Plain text password to encrypt
     * @returns {string} Encrypted password hash
     */
    async encryptPassword(password) {
        try {
            if (!password) return '';

            // Hash password with Argon2id
            const hash = await argon2.hash(password, this.argon2Config);

            console.log('🔐 Password encrypted with Argon2id');
            return hash;
        } catch (error) {
            console.error('❌ Encryption error:', error.message);
            throw new Error('Failed to encrypt password');
        }
    }

    /**
     * Verify a password against an Argon2 hash
     * Note: Argon2 is one-way hashing, so we can only verify, not decrypt
     * For actual decryption, we need to store the password encrypted with a reversible method
     * 
     * @param {string} password - Plain text password to verify
     * @param {string} hash - Argon2 hash to verify against
     * @returns {boolean} True if password matches hash
     */
    async verifyPassword(password, hash) {
        try {
            if (!password || !hash) return false;

            const isValid = await argon2.verify(hash, password);
            return isValid;
        } catch (error) {
            console.error('❌ Verification error:', error.message);
            return false;
        }
    }

    /**
     * Encrypt password for storage (reversible encryption using AES-256-GCM)
     * This is needed because Argon2 is one-way hashing
     * We use AES-256-GCM for reversible encryption so passwords can be decrypted
     * 
     * @param {string} password - Plain text password to encrypt
     * @returns {string} Encrypted password in format: iv:authTag:encryptedData
     */
    encryptPasswordReversible(password) {
        try {
            if (!password) return '';

            // Generate a random initialization vector (IV)
            const iv = crypto.randomBytes(16);

            // Create cipher
            const cipher = crypto.createCipheriv(
                'aes-256-gcm',
                Buffer.from(this.getMasterKey(), 'hex'),
                iv
            );

            // Encrypt the password
            let encrypted = cipher.update(password, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            // Return IV, auth tag, and encrypted data (all needed for decryption)
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch (error) {
            console.error('❌ Reversible encryption error:', error.message);
            throw new Error('Failed to encrypt password');
        }
    }

    /**
     * Decrypt a password using AES-256-GCM
     * @param {string} encryptedPassword - Encrypted password in format: iv:authTag:encryptedData
     * @returns {string} Decrypted plain text password
     */
    decryptPassword(encryptedPassword, customKey = null) {
        try {
            if (!encryptedPassword) return '';

            // Split the encrypted data
            const parts = encryptedPassword.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted password format');
            }

            const [ivHex, authTagHex, encrypted] = parts;

            // Convert hex strings back to buffers
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');

            const keyHex = customKey || this.getMasterKey();

            // Create decipher
            const decipher = crypto.createDecipheriv(
                'aes-256-gcm',
                Buffer.from(keyHex, 'hex'),
                iv
            );

            // Set auth tag
            decipher.setAuthTag(authTag);

            // Decrypt the password
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('❌ Decryption error:', error.message);
            throw new Error(`Failed to decrypt password: ${error.message}`);
        }
    }

    /**
     * Generate a one-time key for decryption
     * @param {string} username - Username requesting the key
     * @returns {object} Object containing the one-time key and expiration
     */
    generateOneTimeKey(username) {
        // Generate a random 32-character key
        const oneTimeKey = crypto.randomBytes(16).toString('hex');

        // Set expiration (1 minute from now)
        const expiresAt = Date.now() + (1 * 60 * 1000);

        // Store the key
        this.oneTimeKeys.set(oneTimeKey, {
            username,
            expiresAt,
            used: false
        });

        console.log(`🔑 One-time key generated for ${username}`);
        console.log(`⏰ Expires at: ${new Date(expiresAt).toLocaleString()}`);

        return {
            key: oneTimeKey,
            expiresAt: new Date(expiresAt).toISOString(),
            expiresIn: '1 minute'
        };
    }

    /**
     * Validate and consume a one-time key
     * @param {string} oneTimeKey - The one-time key to validate
     * @param {string} username - Username attempting to use the key
     * @returns {boolean} True if key is valid and not expired
     */
    validateOneTimeKey(oneTimeKey, username) {
        const keyData = this.oneTimeKeys.get(oneTimeKey);

        if (!keyData) {
            console.warn('⚠️  Invalid one-time key');
            return false;
        }

        if (keyData.used) {
            console.warn('⚠️  One-time key already used');
            this.oneTimeKeys.delete(oneTimeKey);
            return false;
        }

        if (Date.now() > keyData.expiresAt) {
            console.warn('⚠️  One-time key expired');
            this.oneTimeKeys.delete(oneTimeKey);
            return false;
        }

        if (keyData.username !== username) {
            console.warn('⚠️  One-time key username mismatch');
            return false;
        }

        // Mark as used and delete
        keyData.used = true;
        this.oneTimeKeys.delete(oneTimeKey);

        console.log(`✅ One-time key validated for ${username}`);
        return true;
    }

    /**
     * Cleanup expired keys from memory
     */
    cleanupExpiredKeys() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, data] of this.oneTimeKeys.entries()) {
            if (now > data.expiresAt) {
                this.oneTimeKeys.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired one-time keys`);
        }
    }

    /**
     * Get stats about one-time keys
     */
    getStats() {
        return {
            activeKeys: this.oneTimeKeys.size,
            keys: Array.from(this.oneTimeKeys.entries()).map(([key, data]) => ({
                key: key.substring(0, 8) + '...',
                username: data.username,
                expiresAt: new Date(data.expiresAt).toISOString(),
                used: data.used
            }))
        };
    }
}

// Export singleton instance
module.exports = new PasswordEncryption();
