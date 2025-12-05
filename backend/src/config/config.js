// Load environment variables - Vercel handles this automatically in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const config = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Hostaway API Configuration
  HOSTAWAY_AUTH_TOKEN: process.env.HOSTAWAY_AUTH_TOKEN || '',
  HOSTAWAY_BASE_URL: process.env.HOSTAWAY_BASE_URL || 'https://api.hostaway.com/v1',
  
  // Exchange Rate API
  EXCHANGE_RATE_API_KEY: process.env.EXCHANGE_RATE_API_KEY || 'cbb36a5aeba2aa9dbaa251e0',
  EXCHANGE_RATE_BASE_URL: process.env.EXCHANGE_RATE_BASE_URL || 'https://v6.exchangerate-api.com/v6',
  
  // Teable Database Configuration
  TEABLE_BASE_URL: process.env.TEABLE_BASE_URL || '',
  TEABLE_BEARER_TOKEN: process.env.TEABLE_BEARER_TOKEN || '',
  TEABLE_REVENUE_BEARER_TOKEN: process.env.TEABLE_REVENUE_BEARER_TOKEN || '',
  
  // Cache Configuration
  CACHE_DIR: process.env.CACHE_DIR || './cache',
  CACHE_TTL_MINUTES: parseInt(process.env.CACHE_TTL_MINUTES) || 10,
  
  // Rate Limiting Configuration
  GENERAL_RATE_LIMIT: parseInt(process.env.GENERAL_RATE_LIMIT) || 10, // requests per second
  FINANCE_RATE_LIMIT: parseInt(process.env.FINANCE_RATE_LIMIT) || 5,  // requests per second
  
  // API Timeout Configuration
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 30000, // 30 seconds
  FINANCE_API_TIMEOUT: parseInt(process.env.FINANCE_API_TIMEOUT) || 45000, // 45 seconds
  
  // Retry Configuration
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  RETRY_DELAY_BASE: parseInt(process.env.RETRY_DELAY_BASE) || 1000, // 1 second
  
  // Batch Processing Configuration
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 10,
  BATCH_DELAY: parseInt(process.env.BATCH_DELAY) || 500, // milliseconds
  
  // Database/File Configuration
  PROPERTIES_FILE: process.env.PROPERTIES_FILE || 'properties.json',
  
  // Timezone Configuration
  TIMEZONE_OFFSET: parseInt(process.env.TIMEZONE_OFFSET) || 5, // Pakistan timezone UTC+5
  
  // Default Exchange Rate (fallback)
  DEFAULT_USD_TO_PKR: parseFloat(process.env.DEFAULT_USD_TO_PKR) || 279,
  
  // Custom Field IDs
  CHECK_IN_FIELD_ID: parseInt(process.env.CHECK_IN_FIELD_ID) || 76281,
  
  // Channel IDs
  AIRBNB_CHANNEL_ID: parseInt(process.env.AIRBNB_CHANNEL_ID) || 2018,
  BOOKING_CHANNEL_ID: parseInt(process.env.BOOKING_CHANNEL_ID) || 2013,
  
  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING === 'true',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Security
  API_KEY: process.env.API_KEY || '', // Optional API key for securing endpoints
  
  // Performance Monitoring
  ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  
  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 300000, // 5 minutes

  // Production URLs
  PRODUCTION_URL: process.env.PRODUCTION_URL || '',
  PRODUCTION_AUTH_URL: process.env.PRODUCTION_AUTH_URL || '',
  PRODUCTION_DASHBOARD_URL: process.env.PRODUCTION_DASHBOARD_URL || '',

  // Portal Configuration
  PORTAL_URL: process.env.PORTAL_URL || '',
  PORTAL_AUTH_URL: process.env.PORTAL_AUTH_URL || '',
};

// Validation - Check for critical environment variables
const requiredEnvVars = ['HOSTAWAY_AUTH_TOKEN', 'TEABLE_BASE_URL', 'TEABLE_BEARER_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(envVar => !config[envVar]);

// Add missing env vars to config object with default values to prevent 500 errors
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  
  // Provide default/fallback values to prevent API crashes
  missingEnvVars.forEach(envVar => {
    switch(envVar) {
      case 'HOSTAWAY_AUTH_TOKEN':
        config[envVar] = process.env.HOSTAWAY_AUTH_TOKEN || 'Bearer_NOT_SET';
        break;
      case 'TEABLE_BASE_URL':
        config[envVar] = process.env.TEABLE_BASE_URL || 'https://teable.namuve.com/api/table/NOT_SET/record';
        break;
      case 'TEABLE_BEARER_TOKEN':
        config[envVar] = process.env.TEABLE_BEARER_TOKEN || 'NOT_SET';
        break;
    }
  });
  
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Production deployment with missing environment variables - some features may not work');
    console.warn('⚠️  Using fallback values to prevent crashes');
  } else {
    console.warn('Running in development mode with missing environment variables');
  }
}

// Log configuration in development
if (config.NODE_ENV === 'development') {
  console.log('Configuration loaded:', {
    ...config,
    HOSTAWAY_AUTH_TOKEN: config.HOSTAWAY_AUTH_TOKEN ? '[HIDDEN]' : '[NOT SET]',
    TEABLE_BEARER_TOKEN: config.TEABLE_BEARER_TOKEN ? '[HIDDEN]' : '[NOT SET]',
    API_KEY: config.API_KEY ? '[HIDDEN]' : '[NOT SET]'
  });
}

module.exports = config;
