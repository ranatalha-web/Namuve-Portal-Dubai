// API Configuration
const getApiBaseUrl = () => {
  // Get hostname and protocol
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Production URLs - use same domain without port (nginx handles routing)
  if (hostname === '137.184.14.198') {
    // IP address - use HTTP with port
    return 'http://137.184.14.198:5000';
  }
  
  if (hostname === 'portal.namuve.com' || hostname === 'uaeportal.namuve.com') {
    // Domain names - use same protocol and domain (no port)
    // Nginx will route /api/* to backend
    return `${protocol}//${hostname}`;
  }
  
  // If not localhost, assume it's production and use same protocol
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // For other domains, use same protocol and domain
    return `${protocol}//${hostname}`;
  }
  
  // Development - use environment variable or localhost
  return process.env.REACT_APP_API_URL || "http://localhost:5000";
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Base URL for dynamic endpoints
  BASE_URL: API_BASE_URL,

  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  VERIFY_ADMIN: `${API_BASE_URL}/api/auth/admin/verify`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,
  VALIDATE_USERNAME: `${API_BASE_URL}/api/auth/validate-username`,
  VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify-token`,
  AUTH_HEALTH: `${API_BASE_URL}/api/auth/health`,

  // User endpoints
  USERS: `${API_BASE_URL}/api/auth/admin/users`,
  CREATE_USER: `${API_BASE_URL}/api/auth/admin/create-user`,
  UPDATE_USER_ROLE: `${API_BASE_URL}/api/auth/admin/update-role`,
  UPDATE_USERNAME: `${API_BASE_URL}/api/auth/admin/update-username`,
  UPDATE_USER_NAME: `${API_BASE_URL}/api/auth/admin/update-name`,
  UPDATE_PASSWORD: `${API_BASE_URL}/api/auth/admin/update-password`,
  DELETE_USER: `${API_BASE_URL}/api/auth/admin/delete-user`,
  PASSWORD_HISTORY: `${API_BASE_URL}/api/auth/admin/password-history`,
  DELETE_PASSWORD_HISTORY: `${API_BASE_URL}/api/auth/admin/delete-password-history`,

  // Revenue endpoints
  REVENUE: `${API_BASE_URL}/api/revenue`,
  REVENUE_SUMMARY: `${API_BASE_URL}/api/revenue/summary`,
  REVENUE_OCCUPANCY: `${API_BASE_URL}/api/revenue/occupancy`,
  REVENUE_REFRESH: `${API_BASE_URL}/api/revenue/refresh`,
  REVENUE_CACHE_STATS: `${API_BASE_URL}/api/revenue/cache-stats`,
  REVENUE_CLEAR_CACHE: `${API_BASE_URL}/api/revenue/clear-cache`,
  REVENUE_WARM_CACHE: `${API_BASE_URL}/api/revenue/warm-cache`,
  REVENUE_HEALTH: `${API_BASE_URL}/api/revenue/health`,
  REVENUE_REFRESH_LISTINGS: `${API_BASE_URL}/api/revenue/refresh-listings`,
  REVENUE_LISTINGS: `${API_BASE_URL}/api/revenue/listings`,
  REVENUE_CLEAR_LISTINGS_CACHE: `${API_BASE_URL}/api/revenue/clear-listings-cache`,
  REVENUE_CRON: `${API_BASE_URL}/api/revenue/cron`,
  REVENUE_TEST_MONTHLY_TARGET: `${API_BASE_URL}/api/revenue/test-monthly-target`,

  // Revenue Table endpoints (Ultra Fast Database)
  REVENUE_TABLE_FAST_DASHBOARD: `${API_BASE_URL}/api/revenue-table/fast-dashboard-data`,
  REVENUE_TABLE_DATA: `${API_BASE_URL}/api/revenue-table/revenue-data`,
  REVENUE_TABLE_LISTING_DATA: `${API_BASE_URL}/api/revenue-table/listing-revenue-data`,

  // Dubai Revenue endpoints
  DUBAI_REVENUE: `${API_BASE_URL}/api/dubai-revenue`,
  DUBAI_REVENUE_TODAY: `${API_BASE_URL}/api/dubai-revenue/today`,
  DUBAI_REVENUE_STORE: `${API_BASE_URL}/api/dubai-revenue/store`,
  DUBAI_REVENUE_LISTINGS: `${API_BASE_URL}/api/dubai-revenue/listings`,
  DUBAI_REVENUE_HEALTH: `${API_BASE_URL}/api/dubai-revenue/health`,

  // Dubai Database endpoints (FAST - from Teable, no Hostaway)
  DUBAI_PAYMENT_DATABASE_DETAILS: `${API_BASE_URL}/api/dubai-payment/database/details`,
  DUBAI_REVENUE_DATABASE_ACHIEVED: `${API_BASE_URL}/api/dubai-revenue/database/achieved`,
  DUBAI_REVENUE_DATABASE_LISTING: `${API_BASE_URL}/api/dubai-revenue/database/listing`,

  // Teable endpoints
  TEABLE_STATUS: `${API_BASE_URL}/api/teable/status`,
  TEABLE_START: `${API_BASE_URL}/api/teable/start`,
  TEABLE_STOP: `${API_BASE_URL}/api/teable/stop`,
  TEABLE_RESET_COOLDOWN: `${API_BASE_URL}/api/teable/reset-cooldown`,
  TEABLE_POSTING_STATUS: `${API_BASE_URL}/api/teable/posting-status`,
  TEABLE_TEST_CONNECTION: `${API_BASE_URL}/api/teable/test-connection`,
  TEABLE_MANUAL_POST: `${API_BASE_URL}/api/teable/manual-post`,
  TEABLE_POST_SPECIFIC: `${API_BASE_URL}/api/teable/post-specific`,
  TEABLE_DEBUG_HOUR_CHECK: `${API_BASE_URL}/api/teable/debug-hour-check`,
  TEABLE_MONTHLY_REVENUE: `${API_BASE_URL}/api/teable/monthly-revenue`,
  TEABLE_QUARTERLY_REVENUE: `${API_BASE_URL}/api/teable/quarterly-revenue`,

  // Monthly target
  MONTHLY_TARGET: `${API_BASE_URL}/api/monthly-target`,

  // Occupancy endpoints
  OCCUPANCY: `${API_BASE_URL}/api/occupancy`,
  OCCUPANCY_CURRENT: `${API_BASE_URL}/api/occupancy/current`,
  OCCUPANCY_HEALTH: `${API_BASE_URL}/api/occupancy/health`,
  OCCUPANCY_REPORT: `${API_BASE_URL}/api/occupancy/report`,
  OCCUPANCY_TODAY_CHECKINS: `${API_BASE_URL}/api/occupancy/today-checkins`,
  OCCUPANCY_YESTERDAY_TODAY: `${API_BASE_URL}/api/occupancy/yesterday-today`,

  // Rooms endpoints
  ROOMS_LISTINGS: `${API_BASE_URL}/api/rooms/listings`,
  ROOMS_LISTING_BY_ID: `${API_BASE_URL}/api/rooms/listings`, // + /:id
  ROOMS_CLEANING_STATUS: `${API_BASE_URL}/api/rooms/cleaning-status`,
  ROOMS_UPDATE_CLEANING_STATUS_OLD: `${API_BASE_URL}/api/rooms/cleaning-status`, // + /:id (PUT)
  ROOMS_UPDATE_CLEANING_STATUS: `${API_BASE_URL}/api/rooms/update-cleaning-status`,
  ROOMS_AVAILABILITY: `${API_BASE_URL}/api/rooms/availability`,
  ROOMS_HEALTH: `${API_BASE_URL}/api/rooms/health`,
  ROOMS_TEST_CORS: `${API_BASE_URL}/api/rooms/test-cors`,
  ROOMS_TEST_TEABLE: `${API_BASE_URL}/api/rooms/test-teable`,

  // Rooms Teable endpoints
  ROOMS_TEABLE_SYNC: `${API_BASE_URL}/api/rooms-teable/sync`,
  ROOMS_TEABLE_DATA: `${API_BASE_URL}/api/rooms-teable/data`,
  ROOMS_TEABLE_TEST: `${API_BASE_URL}/api/rooms-teable/test`,

  // Room Availability Teable endpoints
  ROOM_AVAILABILITY_TEABLE_SYNC: `${API_BASE_URL}/api/room-availability-teable/sync`,
  ROOM_AVAILABILITY_TEABLE_DATA: `${API_BASE_URL}/api/room-availability-teable/data`,
  ROOM_AVAILABILITY_TEABLE_TEST: `${API_BASE_URL}/api/room-availability-teable/test`,

  // Room Details Teable endpoints
  ROOM_DETAILS_TEABLE_SYNC: `${API_BASE_URL}/api/room-details-teable/sync`,
  ROOM_DETAILS_TEABLE_DATA: `${API_BASE_URL}/api/room-details-teable/data`,
  ROOM_DETAILS_TEABLE_TEST: `${API_BASE_URL}/api/room-details-teable/test`,
  ROOM_DETAILS_TEABLE_MANUAL_SYNC: `${API_BASE_URL}/api/room-details-teable/manual-sync`,

  // Payment endpoints (Pakistan)
  PAYMENT_TODAY_RESERVATIONS: `${API_BASE_URL}/api/payment/today-reservations`,
  PAYMENT_RESERVATION_BY_ID: `${API_BASE_URL}/api/payment/reservation`, // + /:id
  PAYMENT_HEALTH: `${API_BASE_URL}/api/payment/health`,

  // Dubai Payment endpoints (UAE)
  DUBAI_PAYMENT_TODAY_RESERVATIONS: `${API_BASE_URL}/api/dubai-payment/today-reservations`,
  DUBAI_PAYMENT_RESERVATION_BY_ID: `${API_BASE_URL}/api/dubai-payment/reservation`, // + /:id
  DUBAI_PAYMENT_HEALTH: `${API_BASE_URL}/api/dubai-payment/health`,

  // Payment Teable endpoints (fast loading with cache)
  PAYMENT_TEABLE_FAST: `${API_BASE_URL}/api/payment-teable/fast`,
  PAYMENT_TEABLE_SYNC: `${API_BASE_URL}/api/payment-teable/sync`,
  PAYMENT_TEABLE_RECORDS: `${API_BASE_URL}/api/payment-teable/records`,

  // Payment helper functions
  PAYMENT_GET_RESERVATION: (id) => `${API_BASE_URL}/api/payment/reservation/${id}`,
  DUBAI_PAYMENT_GET_RESERVATION: (id) => `${API_BASE_URL}/api/dubai-payment/reservation/${id}`,

  // Hostaway Cleaning Status endpoints
  HOSTAWAY_CLEANING_STATUS_ALL: `${API_BASE_URL}/api/hostaway/cleaning-status/all`,
  HOSTAWAY_CLEANING_STATUS_DUBAI: `${API_BASE_URL}/api/hostaway/cleaning-status/dubai`,
  HOSTAWAY_CLEANING_STATUS_LISTING: `${API_BASE_URL}/api/hostaway/cleaning-status/listing`, // + /:id
  HOSTAWAY_CLEANING_STATUS_MULTIPLE: `${API_BASE_URL}/api/hostaway/cleaning-status/multiple`,
  HOSTAWAY_CLEANING_STATUS_SUMMARY: `${API_BASE_URL}/api/hostaway/cleaning-status/summary`,

  // Hostaway Cleaning Status helper functions
  HOSTAWAY_CLEANING_STATUS_GET_LISTING: (id) => `${API_BASE_URL}/api/hostaway/cleaning-status/listing/${id}`,

  // Cleaning Status Overrides endpoints
  CLEANING_STATUS_OVERRIDES: `${API_BASE_URL}/api/cleaning-status-overrides`,
  CLEANING_STATUS_OVERRIDE_GET: (id) => `${API_BASE_URL}/api/cleaning-status-overrides/${id}`,
  CLEANING_STATUS_OVERRIDE_ADD: `${API_BASE_URL}/api/cleaning-status-overrides`,
  CLEANING_STATUS_OVERRIDE_UPDATE: (id) => `${API_BASE_URL}/api/cleaning-status-overrides/${id}`,
  CLEANING_STATUS_OVERRIDE_DELETE: (id) => `${API_BASE_URL}/api/cleaning-status-overrides/${id}`,

  // Listing Name Mapping endpoints
  LISTING_NAME_MAPPING: `${API_BASE_URL}/api/listing-name-mapping`,
  LISTING_NAME_MAPPING_SEARCH: (term) => `${API_BASE_URL}/api/listing-name-mapping/search/${term}`,
  LISTING_NAME_MAPPING_BY_ID: (id) => `${API_BASE_URL}/api/listing-name-mapping/by-id/${id}`,
  LISTING_NAME_MAPPING_DEBUG: `${API_BASE_URL}/api/listing-name-mapping/debug-report`,

  // Teable Room Reservation Database endpoints (FAST - <5 seconds, no Hostaway API calls)
  TEABLE_ROOM_SYNC: `${API_BASE_URL}/api/teable-room/sync`,
  TEABLE_ROOM_ALL: `${API_BASE_URL}/api/teable-room/all`,
  TEABLE_ROOM_DELETE_ALL: `${API_BASE_URL}/api/teable-room/delete-all`,

  // Portal URLs
  PORTAL_AUTH_URL: 'https://portal.namuve.com/authentication/sign-in',
};

export default API_ENDPOINTS;
