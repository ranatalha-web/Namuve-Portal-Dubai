const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
// const localhostOnly = require('../middleware/localhostOnly');

// Middleware to log all authentication requests
const logAuthRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🔐 [${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

router.use(logAuthRequest);

// User Login Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Verify Captcha (Skip for admin bypass or if not required in dev)
    if (req.body.captchaToken) {
      await authService.verifyCaptcha(req.body.captchaToken);
    } else if (process.env.NODE_ENV === 'production') {
      // In production, captcha is mandatory
      return res.status(400).json({
        success: false,
        message: 'Captcha verification is required'
      });
    }

    console.log(`🔑 Login attempt for user: ${username}`);

    // Authenticate user
    const result = await authService.authenticateUser(username, password);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// Password Reset Route (Old Method)
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword, verifyPassword } = req.body;

    // Validate input
    if (!username || !newPassword || !verifyPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username, new password, and verify password are required'
      });
    }

    console.log(`🔄 Password reset attempt for user: ${username}`);

    // Reset password
    const result = await authService.resetPassword(username, newPassword, verifyPassword);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Password reset error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Request Password Reset Link
router.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    const origin = req.get('origin');
    const result = await authService.requestPasswordReset(username, origin);

    res.json(result);
  } catch (error) {
    console.error('❌ Forgot Password Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reset Password with Token
router.post('/reset-password-with-token', async (req, res) => {
  try {
    const { token, code, newPassword } = req.body;

    // Accept both 'token' and 'code' for backwards compatibility
    const resetToken = token || code;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    const result = await authService.resetPasswordWithToken(resetToken, newPassword);

    res.json(result);
  } catch (error) {
    console.error('❌ Reset Password Token Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Validate Username Route (for password reset)
router.post('/validate-username', async (req, res) => {
  try {
    const { username } = req.body;

    // Validate input
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    console.log(`🔍 Username validation attempt for: ${username}`);

    // Check if user exists
    const user = await authService.findUserByUsername(username);

    if (user) {
      res.status(200).json({
        success: true,
        message: 'Username found',
        exists: true
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Username not found',
        exists: false
      });
    }
  } catch (error) {
    console.error('❌ Username validation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin Password Verification Route
router.post('/admin/verify', async (req, res) => {
  try {
    const { adminPassword } = req.body;

    if (!adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin password is required'
      });
    }

    console.log('🔐 Admin password verification attempt');

    const isValid = await authService.verifyAdminPassword(adminPassword);

    if (isValid) {
      res.status(200).json({
        success: true,
        message: 'Admin access granted'
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid admin password'
      });
    }
  } catch (error) {
    console.error('❌ Admin verification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create User Route (Admin only)
router.post('/admin/create-user', async (req, res) => {
  try {
    const { name, username, password, role, permissions, createdBy } = req.body;

    console.log('👤 Admin creating user:', username);

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Validate role if provided
    if (role && !['user', 'admin', 'view_only', 'custom'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user", "admin", "view_only" (View Access Only), or "custom" (Custom Permissions)'
      });
    }

    console.log(`👤 Admin creating user: ${username}`);

    // Create user
    const result = await authService.createUser(name, username, password, role || 'user', permissions, createdBy);

    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Create user error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Delete User Route (Admin only)
router.delete('/admin/delete-user', async (req, res) => {
  try {
    const { username } = req.body;

    // Validate input
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    console.log(`🗑️ Admin deleting user: ${username}`);

    // Delete user
    const result = await authService.deleteUser(username);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Delete user error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get All Users Route (Admin only)
router.get('/admin/users', async (req, res) => {
  try {
    console.log('📋 Admin requesting all users');

    // Get all users
    const result = await authService.getAllUsers();

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Get users error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update User Password Route (Admin only)
router.post('/admin/update-password', async (req, res) => {
  try {
    const { adminPassword, username, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!adminPassword || !username || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin password, username, new password, and confirm password are required'
      });
    }

    // Verify admin password
    if (!(await authService.verifyAdminPassword(adminPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin password'
      });
    }

    console.log(`🔄 Admin updating password for user: ${username}`);

    // Update password using existing reset functionality
    const result = await authService.resetPassword(username, newPassword, confirmPassword);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Admin password update error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get Password Reset History Route (Admin only)
router.get('/admin/password-history', async (req, res) => {
  try {
    console.log('📋 Admin requesting password reset history');
    console.log('🔗 Reset Password Table URL:', process.env.RESET_PASSWORD_TABLE_URL);

    // Get password reset history
    const result = await authService.getPasswordResetHistory();

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Get password history error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Token Verification Route
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const decoded = authService.verifyToken(token);

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: decoded
    });
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Update User Role Route (Admin only)
router.put('/admin/update-role', async (req, res) => {
  try {
    const { username, role, permissions } = req.body;

    // Validate input
    if (!username || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username and role are required'
      });
    }

    // Validate role
    if (!['user', 'admin', 'view_only', 'custom'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user", "admin", "view_only" (View Access Only), or "custom" (Custom Permissions)'
      });
    }

    console.log(`🔄 Admin updating role for user: ${username} -> ${role}`);

    // Update user role
    const result = await authService.updateUserRole(username, role, permissions);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Update role error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update username (Admin only)
router.put('/admin/update-username', async (req, res) => {
  try {
    // Get parameters
    const { adminPassword, oldUsername, newUsername } = req.body;

    // Skip admin verification if bypass is used
    if (adminPassword !== "bypass") {
      const isValidAdmin = await authService.verifyAdminPassword(adminPassword);
      if (!isValidAdmin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin password'
        });
      }
    }

    // Validate input
    if (!oldUsername || !newUsername) {
      return res.status(400).json({
        success: false,
        message: 'Both old and new usernames are required'
      });
    }

    console.log(`🔄 Admin updating username: ${oldUsername} -> ${newUsername}`);

    // Update username
    const result = await authService.updateUsername(oldUsername, newUsername);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Update username error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update User Name Route (Admin only)
router.put('/admin/update-name', async (req, res) => {
  try {
    const { username, name } = req.body;

    console.log('👤 Admin updating user name:', username, 'to:', name);

    // Validate input
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Update user name
    const result = await authService.updateUserName(username, name || "");

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Update name error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete Password History Route (Admin only)
router.delete('/admin/delete-password-history', async (req, res) => {
  try {
    const { recordId, deletedBy } = req.body;

    console.log('🗑️ Admin deleting password history record:', recordId, 'by:', deletedBy);

    // Validate input
    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: 'Record ID is required'
      });
    }

    // Delete password history record
    const result = await authService.deletePasswordHistory(recordId, deletedBy || "Unknown Admin");

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Delete password history error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Request One-Time Decryption Key Route (LOCALHOST ONLY) - DISABLED
// router.post('/request-decryption-key', localhostOnly, async (req, res) => {
//   try {
//     const { username } = req.body;
//
//     // Validate input
//     if (!username) {
//       return res.status(400).json({
//         success: false,
//         message: 'Username is required'
//       });
//     }
//
//     console.log(`🔑 Decryption key requested for: ${username}`);
//
//     // Generate one-time key
//     const result = await authService.requestDecryptionKey(username);
//
//     res.status(200).json(result);
//   } catch (error) {
//     console.error('❌ Request decryption key error:', error.message);
//     res.status(400).json({
//       success: false,
//       message: error.message
//     });
//   }
// });

// Decrypt Password with One-Time Key Route (LOCALHOST ONLY) - DISABLED
// router.post('/decrypt-password', localhostOnly, async (req, res) => {
//   try {
//     const { username, oneTimeKey } = req.body;
//
//     // Validate input
//     if (!username || !oneTimeKey) {
//       return res.status(400).json({
//         success: false,
//         message: 'Username and one-time key are required'
//       });
//     }
//
//     console.log(`🔓 Password decryption requested for: ${username}`);
//
//     // Decrypt password
//     const result = await authService.decryptPasswordWithKey(username, oneTimeKey);
//
//     res.status(200).json(result);
//   } catch (error) {
//     console.error('❌ Decrypt password error:', error.message);
//     res.status(400).json({
//       success: false,
//       message: error.message
//     });
//   }
// });

// Decrypt Login Attempt Route (Strict Local Windows/Mac Only)
router.post('/admin/decrypt-login', async (req, res) => {
  try {
    const { adminPassword, recordNumber, customKey } = req.body;

    // 1. Strict Environment Check (User Requirement: Local Windows/Mac Only, No Linux/Server)
    const os = require('os');
    const platform = os.platform();
    const isLocalWindowsOrMac = (platform === 'win32' || platform === 'darwin');
    const isNotProduction = (process.env.NODE_ENV !== 'production');

    // Explicitly block if not Windows/Mac or if running in Production
    if (!isLocalWindowsOrMac || !isNotProduction) {
      console.warn(`🛑 Blocked decryption attempt on unauthorized environment: Platform=${platform}, Env=${process.env.NODE_ENV}`);
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This feature is restricted to local Windows/Mac environments only.'
      });
    }

    if (!adminPassword || !recordNumber) {
      return res.status(400).json({
        success: false,
        message: 'Admin password and record number are required'
      });
    }

    // 2. Verify Admin Password
    // Allow "bypass" for local development convenience (consistent with other admin routes)
    if (adminPassword !== "bypass") {
      const isValidAdmin = await authService.verifyAdminPassword(adminPassword);
      if (!isValidAdmin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin password'
        });
      }
    }

    console.log(`🔓 Admin decrypting login attempt record #${recordNumber}`);

    // 3. Get Decrypted Record
    const result = await authService.getDecryptedLoginAttempt(recordNumber, customKey);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Decrypt login error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
