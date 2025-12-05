/**
 * Sanitizer utility to hide sensitive data from logs and responses
 * Prevents API keys, tokens, and passwords from being exposed
 */

const SENSITIVE_KEYS = [
  'authorization',
  'bearer',
  'token',
  'api_key',
  'apikey',
  'secret',
  'password',
  'pwd',
  'auth',
  'access_token',
  'refresh_token',
  'jwt',
  'x-api-key',
  'x-auth-token',
  'teable',
  'hostaway',
  'bearer_token'
];

/**
 * Sanitize an object by hiding sensitive values
 * @param {*} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @returns {*} Sanitized object
 */
function sanitizeObject(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 5) return '[DEEP_OBJECT]';
  
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      // Check if array index name is sensitive
      if (isSensitiveKey(index.toString())) {
        return '[HIDDEN]';
      }
      return sanitizeObject(item, depth + 1);
    });
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[HIDDEN]';
      } else if (typeof value === 'string' && value.length > 100) {
        // Hide long strings that might contain tokens
        sanitized[key] = value.substring(0, 50) + '...[TRUNCATED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a string by hiding tokens and keys
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return str;

  // Hide Bearer tokens
  str = str.replace(/Bearer\s+[^\s]+/gi, 'Bearer [HIDDEN]');
  
  // Hide JWT tokens (pattern: xxx.yyy.zzz)
  str = str.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_HIDDEN]');
  
  // Hide teable tokens
  str = str.replace(/teable_[a-zA-Z0-9_+/=]+/gi, 'teable_[HIDDEN]');
  
  // Hide long strings that look like tokens (40+ chars of alphanumeric)
  str = str.replace(/[a-zA-Z0-9]{40,}/g, (match) => {
    if (match.length > 60) {
      return match.substring(0, 10) + '[HIDDEN]' + match.substring(match.length - 10);
    }
    return '[HIDDEN]';
  });

  return str;
}

/**
 * Check if a key is sensitive
 * @param {string} key - Key to check
 * @returns {boolean} True if key is sensitive
 */
function isSensitiveKey(key) {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey));
}

/**
 * Get a safe version of an error for logging
 * @param {Error} error - Error object
 * @returns {object} Safe error object
 */
function getSafeError(error) {
  if (!error) return null;

  const safeError = {
    message: sanitizeString(error.message),
    code: error.code,
    status: error.status,
    statusCode: error.statusCode
  };

  // Include response data if available, but sanitized
  if (error.response) {
    safeError.response = {
      status: error.response.status,
      statusText: error.response.statusText,
      data: sanitizeObject(error.response.data)
    };
  }

  // Include request info if available, but sanitized
  if (error.request) {
    safeError.request = {
      method: error.request.method,
      url: sanitizeString(error.request.url),
      headers: sanitizeObject(error.request.headers)
    };
  }

  return safeError;
}

/**
 * Create a safe logger that sanitizes sensitive data
 * @returns {object} Safe logger object
 */
function createSafeLogger() {
  return {
    log: (...args) => {
      const sanitized = args.map(arg => sanitizeObject(arg));
      console.log(...sanitized);
    },
    error: (...args) => {
      const sanitized = args.map(arg => {
        if (arg instanceof Error) {
          return getSafeError(arg);
        }
        return sanitizeObject(arg);
      });
      console.error(...sanitized);
    },
    warn: (...args) => {
      const sanitized = args.map(arg => sanitizeObject(arg));
      console.warn(...sanitized);
    },
    info: (...args) => {
      const sanitized = args.map(arg => sanitizeObject(arg));
      console.info(...sanitized);
    },
    debug: (...args) => {
      const sanitized = args.map(arg => sanitizeObject(arg));
      console.debug(...sanitized);
    }
  };
}

module.exports = {
  sanitizeObject,
  sanitizeString,
  isSensitiveKey,
  getSafeError,
  createSafeLogger
};
