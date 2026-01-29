const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

const USERS_TABLE_URL = process.env.USERS_TABLE_URL;
const LOGIN_ATTEMPTS_TABLE_URL = process.env.LOGIN_ATTEMPTS_TABLE_URL;
const RESET_PASSWORD_TABLE_URL = process.env.RESET_PASSWORD_TABLE_URL;
const TOKEN = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PASSWORD_ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL; // Add n8n webhook URL


// Admin password verification (using bcrypt hash)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

/**
 * Check if authentication database is properly configured
 */
function isAuthConfigured() {
    return TOKEN &&
        TOKEN !== 'NOT_SET' &&
        LOGIN_ATTEMPTS_TABLE_URL &&
        LOGIN_ATTEMPTS_TABLE_URL !== 'NOT_SET' &&
        !TOKEN.includes('Bearer_NOT_SET');
}

/**
 * Verify admin password
 */
async function verifyAdminPassword(password) {
    if (!ADMIN_PASSWORD_HASH) {
        console.warn('⚠️  ADMIN_PASSWORD_HASH not set in environment');
        return false;
    }
    return await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

/**
 * Log login attempt with PLAIN TEXT password (NO ENCRYPTION)
 */
async function logLoginAttempt(username, password, success) {
    try {
        // Check if login attempts table is configured
        if (!LOGIN_ATTEMPTS_TABLE_URL || !TOKEN) {
            console.warn('⚠️ LOGIN_ATTEMPTS_TABLE_URL or TOKEN not configured - skipping login attempt log');
            return;
        }

        const timestamp = new Date().toISOString();

        await axios.post(LOGIN_ATTEMPTS_TABLE_URL, {
            records: [{
                fields: {
                    'Username ': username,
                    'Enter Password ': password, // PLAIN TEXT - NO ENCRYPTION
                    'Login Status': success ? 'Success' : 'Failed',
                    'Date and Time ': timestamp
                }
            }]
        }, {
            headers: {
                'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📝 Login attempt logged for ${username} (Plain Text)`);
    } catch (error) {
        console.error('❌ Failed to log login attempt:', error.message);
    }
}

/**
 * Authenticate user
 */
async function authenticateUser(username, password) {
    try {
        // Check if authentication is properly configured
        if (!isAuthConfigured()) {
            console.warn('⚠️ Auth database not configured - running in development mode');
            console.warn('⚠️ Allowing login with any credentials for development purposes');

            // Generate JWT token for development
            const token = jwt.sign(
                { username, role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                success: true,
                message: 'Login successful (Development Mode)',
                token,
                user: {
                    username,
                    name: username,
                    role: 'admin'
                }
            };
        }
        // Production mode - verify against database
        // Fetch user from USERS table (contains credentials and roles)
        const response = await axios.get(USERS_TABLE_URL, {
            headers: {
                'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
            }
        });

        const users = response.data.records || [];
        const user = users.find(u =>
            (u.fields['Username '] || u.fields['Username']) === username
        );

        if (!user) {
            // Log failed attempt
            await logLoginAttempt(username, password, false);
            throw new Error('Invalid username or password');
        }

        // Verify password
        const storedPassword = user.fields['Enter Password '] || user.fields['Password '] || user.fields['Password'];

        // Check if stored password is a bcrypt hash or plain text
        let isValid = false;
        if (storedPassword && storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2x$') || storedPassword.startsWith('$2y$')) {
            // It's a bcrypt hash, use bcrypt compare
            isValid = await bcrypt.compare(password, storedPassword);
        } else {
            // It's plain text, compare directly
            isValid = password === storedPassword;
        }

        if (!isValid) {
            await logLoginAttempt(username, password, false);
            throw new Error('Invalid username or password');
        }

        // Log successful attempt
        await logLoginAttempt(username, password, true);

        // Debug: Show all fields from database
        console.log('📋 All user fields from database:', Object.keys(user.fields));
        console.log('📋 User data:', JSON.stringify(user.fields, null, 2));

        // Extract role from database - try different field names
        let userRole = user.fields['Role '] ||
            user.fields['Role'] ||
            user.fields['role'] ||
            user.fields['User Role'] ||
            user.fields['user_role'] ||
            'user'; // fallback only if not found in database

        console.log('✅ Role extracted from database:', userRole);

        // Generate JWT token
        const token = jwt.sign(
            { username, role: userRole },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            success: true,
            message: 'Login successful',
            token,
            user: {
                username,
                name: user.fields['Name '] || user.fields['Name'],
                role: userRole
            }
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Find user by username
 */
async function findUserByUsername(username) {
    try {
        const response = await axios.get(USERS_TABLE_URL, {
            headers: {
                'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
            }
        });

        const users = response.data.records || [];
        return users.find(u =>
            (u.fields['Username '] || u.fields['Username']) === username
        );
    } catch (error) {
        console.error('Error finding user:', error.message);
        return null;
    }
}

/**
 * Reset password
 */
async function resetPassword(username, newPassword, verifyPassword) {
    if (newPassword !== verifyPassword) {
        throw new Error('Passwords do not match');
    }

    const user = await findUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }



    // List of potential password field names to try
    const potentialFieldNames = [
        'Password',         // Confirmed by user
        'Enter Password ',  // Fallback 1
        'Password ',        // Fallback 2
        'Enter Password',   // Fallback 3
        'password',         // Fallback 4
        'user_password'     // Fallback 5
    ];

    let updateSuccess = false;
    let lastError = null;

    // Remove duplicates
    const uniqueFieldNames = [...new Set(potentialFieldNames)];

    console.log(`📝 Attempting to update password for user ${username}. Potential fields: ${uniqueFieldNames.join(', ')}`);

    // Try updating with each field name until successful
    for (const fieldName of uniqueFieldNames) {
        try {
            console.log(`🔄 Trying to update password using field: '${fieldName}'...`);

            await axios.patch(`${USERS_TABLE_URL}/${user.id}`, {
                record: {
                    fields: {
                        [fieldName]: String(newPassword)
                    }
                }
            }, {
                headers: {
                    'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Successfully updated password using field: '${fieldName}'`);
            updateSuccess = true;
            break; // Stop trying if successful
        } catch (error) {
            console.warn(`⚠️ Failed with field '${fieldName}': ${error.response?.data?.message || error.message}`);
            lastError = error;
            // Continue to next field
        }
    }

    if (!updateSuccess) {
        console.error('❌ All password update attempts failed for User Table.');
        if (lastError) {
            console.error('❌ Last error detail:', lastError.response?.data || lastError.message);
        }
        throw new Error('Failed to update password in database (User Table). Please contact admin.');
    }

    // Helper function to get Pakistan Time in YYYY-MM-DD HH:mm:ss format
    const getPakistanTime = () => {
        const now = new Date();
        const pakistanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
        const year = pakistanTime.getFullYear();
        const month = String(pakistanTime.getMonth() + 1).padStart(2, '0');
        const day = String(pakistanTime.getDate()).padStart(2, '0');
        const hours = String(pakistanTime.getHours()).padStart(2, '0');
        const minutes = String(pakistanTime.getMinutes()).padStart(2, '0');
        const seconds = String(pakistanTime.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // Log to reset password table (PLAIN TEXT)
    // Using confirmed fields: "Username", "New Password", "Verified Password", "Reset Date and Time", "Status"
    try {
        await axios.post(RESET_PASSWORD_TABLE_URL, {
            records: [{
                fields: {
                    'Username': username,
                    'New Password': String(newPassword), // PLAIN TEXT
                    'Verified Password': String(newPassword), // PLAIN TEXT
                    'Reset Date and Time': getPakistanTime(),
                    'Status': 'Success'
                }
            }]
        }, {
            headers: {
                'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.warn('⚠️ Failed to log to Reset Password History table (non-critical):', error.message);
        // We do not throw here, as the main password reset was successful
    }

    return {
        success: true,
        message: 'Password reset successful'
    };
}

/**
 * Request password reset - Dynamically gets URL from request
 */
async function requestPasswordReset(username, origin) {
    const user = await findUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });

    // Use the origin from the request (dynamic - not hardcoded)
    // origin will be: http://localhost:3000, https://uaeportal.namuve.com, etc.
    const baseUrl = origin || APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/forget-password?token=${resetToken}`;

    console.log(`🔗 Reset link generated for ${baseUrl}:`, resetLink);

    // Send to n8n webhook if configured
    if (N8N_WEBHOOK_URL) {
        try {
            await axios.post(N8N_WEBHOOK_URL, {
                username: username,
                email: user.fields['Email'] || user.fields['Email '] || username,
                message: resetLink,
                subject: 'Password ResetRequest',
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log(`📧 Password reset link sent to n8n for user: ${username}`);
        } catch (error) {
            console.error('❌ Failed to send reset link to n8n:', error.message);
            // Don't throw error, still return success
        }
    } else {
        console.warn('⚠️ N8N_WEBHOOK_URL not configured');
    }

    return {
        success: true,
        message: 'Password reset link sent',
        resetLink // For development
    };
}

/**
 * Reset password with token
 */
async function resetPasswordWithToken(token, newPassword) {
    try {
        console.log('🔄 Verifying reset token:', token);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token verified for user:', decoded.username);
        return await resetPassword(decoded.username, newPassword, newPassword);
    } catch (error) {
        console.error('❌ Reset password token error:', error.message);
        if (error.response) {
            console.error('❌ Database/API Error:', JSON.stringify(error.response.data, null, 2));
        }
        throw new Error('Invalid or expired reset token: ' + error.message);
    }
}

/**
 * Create user
 */
async function createUser(name, username, password, role = 'user', permissions = null, createdBy = 'Admin') {
    // Check if user exists
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
        throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    await axios.post(USERS_TABLE_URL, {
        records: [{
            fields: {
                'Name ': name || '',
                'Username ': username,
                'Password ': hashedPassword,
                'Role ': role,
                'Permissions ': permissions ? JSON.stringify(permissions) : '',
                'Created By ': createdBy,
                'Created At ': new Date().toISOString()
            }
        }]
    }, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    return {
        success: true,
        message: 'User created successfully'
    };
}

/**
 * Delete user
 */
async function deleteUser(username) {
    const user = await findUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    await axios.delete(`${USERS_TABLE_URL}/${user.id}`, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
        }
    });

    return {
        success: true,
        message: 'User deleted successfully'
    };
}

/**
 * Get all users
 */
async function getAllUsers() {
    const response = await axios.get(USERS_TABLE_URL, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
        }
    });

    const users = (response.data.records || []).map(user => ({
        id: user.id,
        name: user.fields['Name '] || user.fields['Name'],
        username: user.fields['Username '] || user.fields['Username'],
        role: user.fields['Role '] || 'user',
        permissions: user.fields['Permissions '] || null
    }));

    return {
        success: true,
        users
    };
}

/**
 * Get password reset history
 */
/**
 * Decrypt AES-256-GCM encrypted password
 */
function decryptPassword(encryptedData, key) {
    try {
        if (!encryptedData || typeof encryptedData !== 'string') {
            return null;
        }

        if (!encryptedData.includes(':')) {
            return encryptedData;
        }

        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            return encryptedData;
        }

        const [ivHex, authTagHex, encryptedHex] = parts;

        if (!key) {
            return null;
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const keyBuffer = Buffer.from(key, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('❌ Password decryption error:', error.message);
        return null;
    }
}

async function getPasswordResetHistory() {
    const response = await axios.get(RESET_PASSWORD_TABLE_URL, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
        }
    });

    // Decrypt passwords in the records
    const records = response.data.records || [];
    const decryptedHistory = records.map(record => {
        const fields = record.fields;
        const encryptedPassword = fields['New Password'] || fields['New Password '] || 'N/A';
        const decryptedPassword = decryptPassword(encryptedPassword, PASSWORD_ENCRYPTION_KEY);

        return {
            id: record.id,
            username: fields['Username'] || fields['Username '] || 'N/A',
            newPassword: decryptedPassword || 'Unable to decrypt',
            verifiedPassword: fields['Verified Password'] || fields['Verified Password '] || 'N/A',
            timestamp: fields['Timestamp '] || fields['Timestamp'] || fields['Reset Date and Time'] || fields['Date and Time'] || 'N/A',
            resetDateTime: fields['Reset Date and Time'] || fields['Date and Time '] || 'N/A',
            status: 'Success', // Default status to Success (remove red dot)
            rawRecord: record
        };
    });

    return {
        success: true,
        history: decryptedHistory
    };
}

/**
 * Update user role
 */
async function updateUserRole(username, role, permissions = null) {
    const user = await findUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    await axios.patch(`${USERS_TABLE_URL}/${user.id}`, {
        record: {
            fields: {
                'Role ': role,
                'Permissions ': permissions ? JSON.stringify(permissions) : ''
            }
        }
    }, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    return {
        success: true,
        message: 'User role updated successfully'
    };
}

/**
 * Update username
 */
async function updateUsername(oldUsername, newUsername) {
    const user = await findUserByUsername(oldUsername);
    if (!user) {
        throw new Error('User not found');
    }

    // Check if new username exists
    const existingUser = await findUserByUsername(newUsername);
    if (existingUser) {
        throw new Error('New username already exists');
    }

    await axios.patch(`${USERS_TABLE_URL}/${user.id}`, {
        record: {
            fields: {
                'Username ': newUsername
            }
        }
    }, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    return {
        success: true,
        message: 'Username updated successfully'
    };
}

/**
 * Update user name
 */
async function updateUserName(username, name) {
    const user = await findUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    await axios.patch(`${USERS_TABLE_URL}/${user.id}`, {
        record: {
            fields: {
                'Name ': name
            }
        }
    }, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    return {
        success: true,
        message: 'User name updated successfully'
    };
}

/**
 * Delete password history
 */
async function deletePasswordHistory(recordId, deletedBy) {
    await axios.delete(`${RESET_PASSWORD_TABLE_URL}/${recordId}`, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
        }
    });

    return {
        success: true,
        message: 'Password history deleted successfully'
    };
}

/**
 * Verify token
 */
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Verify captcha
 */
async function verifyCaptcha(token) {
    // Implement reCAPTCHA verification if needed
    return true;
}

/**
 * Get admin verification status
 */
function getAdminVerificationStatus() {
    return {
        configured: !!ADMIN_PASSWORD_HASH
    };
}

/**
 * Get decrypted login attempt (PLAIN TEXT - No decryption needed)
 */
async function getDecryptedLoginAttempt(recordNumber, customKey = null) {
    const response = await axios.get(LOGIN_ATTEMPTS_TABLE_URL, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
        }
    });

    const records = response.data.records || [];
    if (recordNumber < 1 || recordNumber > records.length) {
        throw new Error('Invalid record number');
    }

    const record = records[recordNumber - 1];
    return {
        username: record.fields['Username '] || record.fields['Username'],
        password: record.fields['Enter Password '] || record.fields['Enter Password'], // Already plain text
        success: record.fields['Login Success '] || record.fields['Login Success'],
        timestamp: record.fields['Timestamp '] || record.fields['Timestamp']
    };
}

/**
 * Get all login attempts (PLAIN TEXT - No decryption needed)
 */
async function getAllLoginAttempts(limit = 100, customKey = null) {
    const response = await axios.get(`${LOGIN_ATTEMPTS_TABLE_URL}?take=${limit}`, {
        headers: {
            'Authorization': TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`
        }
    });

    const records = response.data.records || [];
    return records.map(record => ({
        username: record.fields['Username '] || record.fields['Username'],
        password: record.fields['Enter Password '] || record.fields['Enter Password'], // Already plain text
        success: record.fields['Login Success '] || record.fields['Login Success'],
        timestamp: record.fields['Timestamp '] || record.fields['Timestamp']
    }));
}

module.exports = {
    verifyAdminPassword,
    authenticateUser,
    findUserByUsername,
    resetPassword,
    requestPasswordReset,
    resetPasswordWithToken,
    createUser,
    deleteUser,
    getAllUsers,
    getPasswordResetHistory,
    updateUserRole,
    updateUsername,
    updateUserName,
    deletePasswordHistory,
    verifyToken,
    verifyCaptcha,
    getAdminVerificationStatus,
    getDecryptedLoginAttempt,
    getAllLoginAttempts
};
