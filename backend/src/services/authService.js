const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config/config');

class AuthService {
  constructor() {
    // Teable database URLs - all from environment variables
    this.USERS_TABLE_URL = process.env.USERS_TABLE_URL;
    this.LOGIN_ATTEMPTS_TABLE_URL = process.env.LOGIN_ATTEMPTS_TABLE_URL;
    this.RESET_PASSWORD_TABLE_URL = process.env.RESET_PASSWORD_TABLE_URL;
    
    // Use the Dubai reservations token which has access to the User table
    this.BEARER_TOKEN = process.env.TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN;
    this.JWT_SECRET = process.env.JWT_SECRET;
    
    // Admin verification - no permanent storage, password entered each time
    this.tempAdminVerification = null;

    // Validate required environment variables
    this.validateEnvironmentVariables();
  }

  // Validate that all required environment variables are set
  validateEnvironmentVariables() {
    const requiredVars = [
      'USERS_TABLE_URL',
      'LOGIN_ATTEMPTS_TABLE_URL',
      'RESET_PASSWORD_TABLE_URL',
      'TEABLE_DUBAI_RESERVATIONS_BEARER_TOKEN',
      'JWT_SECRET'
      // ADMIN_PASSWORD removed - using temporary memory verification
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars);
      console.error('❌ Missing required environment variables:', missingVars);
      
      // In production, don't throw - just warn and continue with limited functionality
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️  Running with missing environment variables - authentication may not work properly');
        this.isConfigured = false;
        return;
      } else {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
    }

    this.isConfigured = true;
    console.log('✅ All authentication environment variables loaded');
  }

  // Helper method to make Teable API requests using axios (same as working services)
  async makeTeableRequest(url, method = 'GET', data = null) {
    try {
      // Handle Bearer token - check if it already has "Bearer " prefix
      const authHeader = this.BEARER_TOKEN.startsWith('Bearer ') 
        ? this.BEARER_TOKEN 
        : `Bearer ${this.BEARER_TOKEN}`;
      
      const config = {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      };

      let response;
      if (method === 'GET') {
        response = await axios.get(url, config);
      } else if (method === 'POST') {
        response = await axios.post(url, data, config);
      } else if (method === 'PUT') {
        response = await axios.put(url, data, config);
      } else if (method === 'PATCH') {
        response = await axios.patch(url, data, config);
      } else if (method === 'DELETE') {
        response = await axios.delete(url, config);
      }

      return response.data;
    } catch (error) {
      console.error('❌ Teable API Error:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      throw error;
    }
  }

  // Get current Pakistan time
  getPakistanDateTime() {
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // UTC+5
    return pakistanTime.toISOString().replace('T', ' ').substring(0, 19);
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        username: user.Username 
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Log login attempt
  async logLoginAttempt(username, enteredPassword, status) {
    try {
      const loginData = {
        records: [{
          fields: {
            "Username ": username,
            "Enter Password ": enteredPassword,
            "Date and Time ": this.getPakistanDateTime(),
            "Login Status": status
          }
        }]
      };

      await this.makeTeableRequest(this.LOGIN_ATTEMPTS_TABLE_URL, 'POST', loginData);
      console.log(`📝 Login attempt logged: ${username} - ${status}`);
    } catch (error) {
      console.error('❌ Error logging login attempt:', error.message);
    }
  }

  // Find user by username
  async findUserByUsername(username) {
    try {
      // Get all users and filter by username
      const response = await this.makeTeableRequest(this.USERS_TABLE_URL);
      
      if (response.records && response.records.length > 0) {
        const user = response.records.find(record => 
          record.fields.Username === username
        );
        return user || null;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error finding user:', error.message);
      throw error;
    }
  }

  // Create new user (Admin only)
  async createUser(name, username, password, role = 'user', permissions = null, createdBy = null) {
    try {
      // Check if service is properly configured
      if (!this.isConfigured) {
        console.warn('⚠️  AuthService not properly configured - user creation not available');
        throw new Error('User creation service not available');
      }

      // Validate role
      if (!['user', 'admin', 'view_only', 'custom'].includes(role)) {
        throw new Error('Invalid role. Must be "user", "admin", "view_only" (View Access Only), or "custom" (Custom Permissions)');
      }

      // Check if user already exists
      const existingUser = await this.findUserByUsername(username);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user data
      const userFields = {
        "Name ": name || "",
        "Username": username,
        "Password": hashedPassword,
        "role": role,
        "Created Date and Time ": this.getPakistanDateTime(),
        "Created By": createdBy || "System"
      };

      // Add permissions field if permissions are provided and role is custom
      if (permissions && role === 'custom') {
        // Use the existing misspelled field name in database
        userFields["Premission "] = JSON.stringify(permissions);
      }

      const userData = {
        records: [{
          fields: userFields
        }]
      };

      try {
        const response = await this.makeTeableRequest(this.USERS_TABLE_URL, 'POST', userData);
        console.log(`✅ User created successfully: ${username}`);
        
        return {
          success: true,
          message: 'User created successfully',
          user: response.records[0]
        };
      } catch (error) {
        // If permissions field doesn't exist, try without it
        if (error.message.includes('Premission') && userFields["Premission "]) {
          console.warn('⚠️  Premission field error in database. Creating user without permissions.');
          delete userFields["Premission "];
          const fallbackUserData = {
            records: [{
              fields: userFields
            }]
          };
          const response = await this.makeTeableRequest(this.USERS_TABLE_URL, 'POST', fallbackUserData);
          console.log('⚠️  User created without permissions. Please fix "Premission " field in Teable database.');
          
          return {
            success: true,
            message: 'User created successfully (without permissions - please fix Premission field in database)',
            user: response.records[0]
          };
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      throw error;
    }
  }

  // Authenticate user
  async authenticateUser(username, password) {
    try {
      // Check if service is properly configured
      if (!this.isConfigured) {
        console.warn('⚠️  AuthService not properly configured - authentication service not available');
        throw new Error('Authentication service not available');
      }

      // Find user
      const user = await this.findUserByUsername(username);
      
      if (!user) {
        await this.logLoginAttempt(username, password, 'Failure - User not found');
        throw new Error('Invalid username or password');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.fields.Password);
      
      if (!isPasswordValid) {
        await this.logLoginAttempt(username, password, 'Failure - Wrong password');
        throw new Error('Invalid username or password');
      }

      // Log successful login
      await this.logLoginAttempt(username, password, 'Success');

      // Generate token
      const token = this.generateToken({
        id: user.id,
        Username: user.fields.Username
      });

      console.log(`✅ User authenticated successfully: ${username}`);
      
      // Prepare user data
      const userData = {
        id: user.id,
        username: user.fields.Username,
        name: user.fields["Name "] || user.fields["Name"] || "",
        role: user.fields.role || 'user',
        createdDate: user.fields['Created Date and Time ']
      };

      // Add permissions for custom users (check both field names)
      if (user.fields.role === 'custom') {
        if (user.fields.permissions) {
          userData.permissions = user.fields.permissions;
        } else if (user.fields["Premission "]) {
          userData.permissions = user.fields["Premission "];
        }
      }

      return {
        success: true,
        message: 'Login successful',
        token,
        user: userData
      };
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      throw error;
    }
  }

  // Reset password
  async resetPassword(username, newPassword, verifyPassword) {
    try {
      // Check if service is properly configured
      if (!this.isConfigured) {
        console.warn('⚠️  AuthService not properly configured - password reset not available');
        throw new Error('Password reset service not available');
      }

      // Check if passwords match
      if (newPassword !== verifyPassword) {
        await this.logPasswordReset(username, newPassword, verifyPassword, 'Password Mismatch');
        throw new Error('Passwords do not match');
      }

      // Find user
      const user = await this.findUserByUsername(username);
      if (!user) {
        await this.logPasswordReset(username, newPassword, verifyPassword, 'Fail - User not found');
        throw new Error('User not found');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      const updateData = {
        records: [{
          id: user.id,
          fields: {
            "Password": hashedPassword
          }
        }]
      };

      await this.makeTeableRequest(this.USERS_TABLE_URL, 'PATCH', updateData);

      // Log password reset
      await this.logPasswordReset(username, newPassword, verifyPassword, 'Success');

      console.log(`✅ Password reset successfully for: ${username}`);
      
      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('❌ Password reset error:', error.message);
      throw error;
    }
  }

  // Log password reset attempt
  async logPasswordReset(username, newPassword, verifyPassword, status) {
    try {
      const resetData = {
        records: [{
          fields: {
            "Username": username,
            "New Password": newPassword,
            "Verified Password": verifyPassword,
            "Status": status,
            "Reset Date and Time": this.getPakistanDateTime()
          }
        }]
      };

      await this.makeTeableRequest(this.RESET_PASSWORD_TABLE_URL, 'POST', resetData);
      console.log(`📝 Password reset logged: ${username} - ${status}`);
    } catch (error) {
      console.error('❌ Error logging password reset:', error.message);
    }
  }

  // Verify admin password - you enter it each time
  async verifyAdminPassword(password) {
    try {
      // Hardcoded bcrypt hash of the admin password (secure approach)
      const adminPasswordHash = '$2b$12$IPwMwJ7bqF1e4IXCZijVHuT.ztY3ktl3Av.1iAAy4mPBsOS5c6Ehe';
      
      // Use bcrypt to compare the entered password with the stored hash
      const isValid = await bcrypt.compare(password, adminPasswordHash);
      
      // Generate a temporary verification token for this session
      if (isValid) {
        const timestamp = Date.now();
        
        // Store verification timestamp
        this.tempAdminVerification = {
          timestamp: timestamp,
          attempts: 0
        };
        
        // Auto-clear after 5 minutes
        setTimeout(() => {
          if (this.tempAdminVerification) {
            delete this.tempAdminVerification;
            console.log('🗑️ Admin verification data auto-cleared');
          }
        }, 5 * 60 * 1000);
      }
      
      console.log('🔐 Admin verification:', isValid ? 'SUCCESS' : 'FAILED');
      console.log('🔐 Password verified using secure hash comparison');
      
      return isValid;
      
    } catch (error) {
      console.error('❌ Admin verification error:', error.message);
      return false;
    }
  }

  // Get admin verification status
  getAdminVerificationStatus() {
    return {
      hasActiveVerification: !!this.tempAdminVerification,
      timestamp: this.tempAdminVerification?.timestamp || null,
      isExpired: this.tempAdminVerification ? 
        (Date.now() - this.tempAdminVerification.timestamp > 5 * 60 * 1000) : true
    };
  }

  // Delete user (Admin only)
  async deleteUser(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }

      // Delete user record
      await this.makeTeableRequest(`${this.USERS_TABLE_URL}/${user.id}`, 'DELETE');
      
      console.log(`✅ User deleted successfully: ${username}`);
      
      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      console.error('❌ Error deleting user:', error.message);
      throw error;
    }
  }

  // Get all users (Admin only)
  async getAllUsers() {
    try {
      // Check if service is properly configured
      if (!this.isConfigured) {
        console.warn('⚠️  AuthService not properly configured - returning empty user list');
        return {
          success: true,
          users: []
        };
      }

      const response = await this.makeTeableRequest(this.USERS_TABLE_URL);
      
      const users = response.records.map(record => {
        const userData = {
          id: record.id,
          username: record.fields.Username,
          name: record.fields["Name "] || record.fields["Name"] || "",
          role: record.fields.role || 'user',
          createdDate: record.fields['Created Date and Time '],
          createdBy: record.fields['Created By'] || 'System'
        };
        
        // Add permissions for custom users (check both field names)
        if (record.fields.role === 'custom') {
          if (record.fields.permissions) {
            userData.permissions = record.fields.permissions;
          } else if (record.fields["Premission "]) {
            userData.permissions = record.fields["Premission "];
          }
        }
        
        return userData;
      });

      return {
        success: true,
        users: users.sort((a, b) => a.createdDate.localeCompare(b.createdDate))
      };
    } catch (error) {
      console.error('❌ Error getting users:', error.message);
      throw error;
    }
  }

  // Get password reset history (Admin only)
  async getPasswordResetHistory() {
    try {
      console.log('🔍 [NEW CODE] Fetching password reset history from:', this.RESET_PASSWORD_TABLE_URL, 'at', new Date().toISOString());
      
      if (!this.RESET_PASSWORD_TABLE_URL) {
        throw new Error('RESET_PASSWORD_TABLE_URL environment variable is not set');
      }
      
      const response = await this.makeTeableRequest(this.RESET_PASSWORD_TABLE_URL);
      
      console.log('📊 Total records received:', response.records?.length || 0);
      
      // Log each record for debugging
      response.records?.forEach((record, index) => {
        console.log(`Record ${index}:`, {
          username: record.fields.Username,
          status: record.fields.Status,
          newPassword: record.fields['New Password'],
          verifiedPassword: record.fields['Verified Password'],
          allFields: Object.keys(record.fields)
        });
      });
      
      // Handle empty response or no records
      if (!response || !response.records || response.records.length === 0) {
        console.log('⚠️ No password reset records found');
        return {
          success: true,
          history: []
        };
      }
      
      const history = response.records
        .filter(record => {
          // Skip records with empty fields object
          if (!record.fields || Object.keys(record.fields).length === 0) {
            console.log('🚫 Skipping record with empty fields:', record.id);
            return false;
          }
          
          // Only include records that have valid username, status, and are not "Unknown"
          const username = record.fields.Username;
          const status = record.fields.Status;
          
          return username && 
                 status && 
                 username.toString().trim() !== '' &&
                 status.toString().trim() !== '' &&
                 username.toString().toLowerCase() !== 'unknown' && 
                 status.toString().toLowerCase() !== 'unknown';
        })
        .map(record => {
          // Try different field name variations
          const newPassword = record.fields['New Password'] || 
                             record.fields['NewPassword'] || 
                             record.fields['new_password'] ||
                             record.fields['Verified Password'] ||
                             record.fields['VerifiedPassword'] ||
                             record.fields['verified_password'] ||
                             '';
                             
          console.log(`🔑 Password found for ${record.fields.Username}:`, newPassword);
          
          return {
            id: record.id,
            username: record.fields.Username,
            status: record.fields.Status,
            resetDateTime: record.fields['Reset Date and Time'] || new Date().toISOString(),
            newPassword: newPassword,
            verifiedPassword: record.fields['Verified Password'] || record.fields['New Password'] || '',
            deletedBy: record.fields['Deleted by '] || null
          };
        });

      console.log('✅ Processed history records:', history.length);

      return {
        success: true,
        history: history.sort((a, b) => b.resetDateTime.localeCompare(a.resetDateTime)) // Most recent first
      };
    } catch (error) {
      console.error('❌ Error getting password reset history:', error.message);
      console.error('❌ Full error:', error);
      throw error;
    }
  }

  // Update user role (Admin only)
  async updateUserRole(username, newRole, permissions = null) {
    try {
      // Validate role
      if (!['user', 'admin', 'view_only', 'custom'].includes(newRole)) {
        throw new Error('Invalid role. Must be "user", "admin", "view_only" (View Access Only), or "custom" (Custom Permissions)');
      }

      // Find user
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user role and permissions
      const updateFields = {
        "role": newRole
      };
      
      // Add permissions field if permissions are provided and role is custom
      if (permissions && newRole === 'custom') {
        // Use the existing misspelled field name in database
        updateFields["Premission "] = JSON.stringify(permissions);
      }
      
      const updateData = {
        records: [{
          id: user.id,
          fields: updateFields
        }]
      };

      try {
        await this.makeTeableRequest(this.USERS_TABLE_URL, 'PATCH', updateData);
      } catch (error) {
        // If permissions field doesn't exist, try without it
        if (error.message.includes('Premission') && updateFields["Premission "]) {
          console.warn('⚠️  Premission field error in database. Updating role without permissions.');
          delete updateFields["Premission "];
          const fallbackUpdateData = {
            records: [{
              id: user.id,
              fields: updateFields
            }]
          };
          await this.makeTeableRequest(this.USERS_TABLE_URL, 'PATCH', fallbackUpdateData);
          console.log('⚠️  Role updated without permissions. Please fix "Premission " field in Teable database.');
        } else {
          throw error;
        }
      }

      console.log(`✅ User role updated successfully: ${username} -> ${newRole}`);
      
      return {
        success: true,
        message: `User role updated to ${newRole} successfully`
      };
    } catch (error) {
      console.error('❌ Error updating user role:', error.message);
      throw error;
    }
  }

  // Update username (Admin only)
  async updateUsername(oldUsername, newUsername) {
    try {
      // Validate input
      if (!oldUsername || !newUsername) {
        throw new Error('Both old and new usernames are required');
      }

      if (oldUsername === newUsername) {
        throw new Error('New username must be different from current username');
      }

      // Check if new username already exists
      const existingUser = await this.findUserByUsername(newUsername);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Find user with old username
      const user = await this.findUserByUsername(oldUsername);
      if (!user) {
        throw new Error('User not found');
      }

      // Update username
      const updateData = {
        records: [{
          id: user.id,
          fields: {
            "Username": newUsername
          }
        }]
      };

      await this.makeTeableRequest(this.USERS_TABLE_URL, 'PATCH', updateData);

      console.log(`✅ Username updated successfully: ${oldUsername} -> ${newUsername}`);
      
      return {
        success: true,
        message: `Username updated to ${newUsername} successfully`
      };
    } catch (error) {
      console.error('❌ Error updating username:', error.message);
      throw error;
    }
  }

  // Update user name
  async updateUserName(username, newName) {
    try {
      // Check if service is properly configured
      if (!this.isConfigured) {
        console.warn('⚠️  AuthService not properly configured - name update not available');
        throw new Error('Name update service not available');
      }

      // Find user
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user name
      const updateData = {
        records: [{
          id: user.id,
          fields: {
            "Name ": newName || ""
          }
        }]
      };

      const response = await this.makeTeableRequest(this.USERS_TABLE_URL, 'PATCH', updateData);
      console.log(`✅ User name updated successfully: ${username} -> ${newName}`);
      console.log('📋 Update response structure:', JSON.stringify(response, null, 2));

      // Handle different response structures
      let updatedUser = null;
      if (response && response.records && Array.isArray(response.records) && response.records.length > 0) {
        updatedUser = response.records[0];
      } else if (response && response.id) {
        updatedUser = response;
      }

      return {
        success: true,
        message: 'Name updated successfully',
        user: updatedUser
      };
    } catch (error) {
      console.error('❌ Error updating name:', error.message);
      throw error;
    }
  }

  // Delete password history record
  async deletePasswordHistory(recordId, deletedBy) {
    try {
      // Check if service is properly configured
      if (!this.isConfigured) {
        console.warn('⚠️  AuthService not properly configured - password history deletion not available');
        throw new Error('Password history deletion service not available');
      }

      // Actually delete the record from the database
      const deleteUrl = `${this.RESET_PASSWORD_TABLE_URL}/${recordId}`;
      const response = await this.makeTeableRequest(deleteUrl, 'DELETE');
      
      console.log(`✅ Password history record permanently deleted: ${recordId} by ${deletedBy}`);

      return {
        success: true,
        message: 'Password history record deleted successfully',
        record: response
      };
    } catch (error) {
      console.error('❌ Error deleting password history:', error.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
