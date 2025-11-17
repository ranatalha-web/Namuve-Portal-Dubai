/**
 * Debug endpoint to check environment variables in Vercel
 * This helps diagnose why environment variables aren't loading
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/debug-env
 * Returns which environment variables are set (without revealing values)
 */
router.get('/', (req, res) => {
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
    HOSTAWAY_AUTH_TOKEN: process.env.HOSTAWAY_AUTH_TOKEN ? 'SET ✅' : 'NOT_SET ❌',
    TEABLE_BASE_URL: process.env.TEABLE_BASE_URL ? 'SET ✅' : 'NOT_SET ❌',
    TEABLE_BEARER_TOKEN: process.env.TEABLE_BEARER_TOKEN ? 'SET ✅' : 'NOT_SET ❌',
    VERCEL: process.env.VERCEL ? 'Running on Vercel ✅' : 'Not on Vercel',
    VERCEL_ENV: process.env.VERCEL_ENV || 'NOT_SET',
    VERCEL_REGION: process.env.VERCEL_REGION || 'NOT_SET',
  };

  // Also show first 5 characters of each token to verify they're loading correctly
  const tokenPreviews = {
    HOSTAWAY_AUTH_TOKEN: process.env.HOSTAWAY_AUTH_TOKEN ? 
      process.env.HOSTAWAY_AUTH_TOKEN.substring(0, 5) + '...' : 'NOT_SET',
    TEABLE_BASE_URL: process.env.TEABLE_BASE_URL || 'NOT_SET',
    TEABLE_BEARER_TOKEN: process.env.TEABLE_BEARER_TOKEN ? 
      process.env.TEABLE_BEARER_TOKEN.substring(0, 5) + '...' : 'NOT_SET',
  };

  res.json({
    success: true,
    message: 'Environment variables check',
    environment: envCheck,
    tokenPreviews: tokenPreviews,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
