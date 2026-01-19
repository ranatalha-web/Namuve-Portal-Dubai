// CONFIGURABLE LOGGING SYSTEM
// Control logs via environment variables or command line arguments
// Usage: 
//   ENABLE_LOGS=true npm start (enable logs)
//   ENABLE_LOGS=false npm start (disable logs)
//   npm start (default: logs enabled in development, disabled in production)

const ENABLE_LOGS = process.env.ENABLE_LOGS !== undefined
  ? process.env.ENABLE_LOGS === 'true'
  : true; // Default: logs disabled

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Override console methods based on ENABLE_LOGS setting
if (!ENABLE_LOGS) {
  console.log = () => { };
  console.error = () => { };
  console.warn = () => { };
  console.info = () => { };
  console.debug = () => { };
} else {
  // Add timestamp and color to logs when enabled
  const addTimestamp = (originalMethod, prefix, color = '') => {
    return (...args) => {
      const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
      originalMethod(`${color}[${timestamp}] ${prefix}`, ...args, '\x1b[0m');
    };
  };

  console.log = addTimestamp(originalConsole.log, '📝 LOG:', '\x1b[36m'); // Cyan
  console.error = addTimestamp(originalConsole.error, '❌ ERROR:', '\x1b[31m'); // Red
  console.warn = addTimestamp(originalConsole.warn, '⚠️  WARN:', '\x1b[33m'); // Yellow
  console.info = addTimestamp(originalConsole.info, 'ℹ️  INFO:', '\x1b[34m'); // Blue
  console.debug = addTimestamp(originalConsole.debug, '🐛 DEBUG:', '\x1b[35m'); // Magenta
}

// Log the current logging status
originalConsole.log(`🔧 Backend Logging: ${ENABLE_LOGS ? '✅ ENABLED' : '❌ DISABLED'}`);
if (ENABLE_LOGS) {
  originalConsole.log('💡 To disable logs: ENABLE_LOGS=false npm start');
} else {
  originalConsole.log('💡 To enable logs: ENABLE_LOGS=true npm start');
}

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const config = require("./config/config");
const { getSafeError } = require("./utils/sanitizer");

const app = express();

// DEBUG: Log all requests matching Vercel handling
app.use((req, res, next) => {
  console.log(`🔍 EXPRESS RECEIVED: ${req.method} ${req.url}`);
  next();
});

// DEBUG: List all routes
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) { // routes registered directly on the app
      routes.push(middleware.route.path);
    } else if (middleware.name === 'router') { // router middleware 
      // This is a bit complex to unroll, just showing we have routers
      routes.push(`Router matching ${middleware.regexp}`);
    }
  });
  res.json({
    message: "Route List",
    routes: routes,
    url_received: req.url,
    original_url: req.originalUrl
  });
});

// Environment-based CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log(`🔍 CORS check for origin: "${origin}"`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }

    // Development Origins
    const developmentOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173', // Vite dev server
      /^http:\/\/localhost:\d+\/?$/, // Allow any localhost port with optional trailing slash
      /^http:\/\/127\.0\.0\.1:\d+\/?$/ // Allow any 127.0.0.1 port with optional trailing slash
    ];

    // Production Origins
    const productionOrigins = [
      'http://128.199.0.150',
      'http://128.199.0.150:3000',
      'http://128.199.0.150/authentication/sign-in',
      'http://137.184.14.198',
      'http://137.184.14.198:3000',
      'http://uaeportal.namuve.com',
      'http://uaeportal.namuve.com:3000',
      'https://uaeportal.namuve.com',
      'https://tested-1pln9mbk8-rana-talhas-projects.vercel.app',
      'https://tested-murex.vercel.app',
      'https://portal.namuve.com',
      /\.vercel\.app$/, // Allow all Vercel domains
    ];

    // Choose origins based on environment
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? productionOrigins
      : [...developmentOrigins, ...productionOrigins]; // Dev includes both for testing

    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        // Check exact match and also match without trailing slash
        const originWithoutSlash = origin.replace(/\/$/, '');
        const allowedWithoutSlash = allowedOrigin.replace(/\/$/, '');
        const match = allowedOrigin === origin || allowedWithoutSlash === originWithoutSlash;
        if (match) console.log(`✅ CORS: Matched string origin "${allowedOrigin}" for "${origin}"`);
        return match;
      }
      if (allowedOrigin instanceof RegExp) {
        const match = allowedOrigin.test(origin);
        if (match) console.log(`✅ CORS: Matched regex pattern "${allowedOrigin}" for origin "${origin}"`);
        return match;
      }
      return false;
    });

    if (isAllowed) {
      console.log(`✅ CORS: Origin "${origin}" is allowed in ${process.env.NODE_ENV || 'development'} mode`);
      callback(null, true);
    } else {
      console.log(`❌ CORS: Origin "${origin}" is NOT allowed in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`❌ Available origins:`, allowedOrigins.filter(o => typeof o === 'string'));
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

// Enable compression for all responses
app.use(compression({
  level: 6, // Compression level (0-9, 6 is good balance)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if the request includes a cache-control: no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    // Use compression for all other responses
    return compression.filter(req, res);
  }
}));

// Use CORS with options, but also add a fallback for development
app.use(cors(corsOptions));

// Additional CORS headers for development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`🔍 Additional CORS middleware - Origin: "${origin}"`);

  // Allow all localhost origins in development
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    console.log(`✅ Additional CORS: Allowing localhost origin "${origin}"`);
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ Handling OPTIONS preflight request for ${req.path}`);
    return res.status(200).end();
  }

  next();
});

app.use(express.json());

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Import routes
const userRoutes = require("./routes/userRoutes");
const revenueRoutes = require("./routes/revenueRoutes");
console.log('📍 About to load dubaiRevenueRoutes...');
let dubaiRevenueRoutes;
try {
  dubaiRevenueRoutes = require("./routes/dubaiRevenueRoutes");
  console.log('✅ dubaiRevenueRoutes loaded successfully');
} catch (error) {
  console.error('❌ Error loading dubaiRevenueRoutes:', error.message);
  dubaiRevenueRoutes = null;
}
const teableRoutes = require("./routes/teableRoutes");
const authRoutes = require("./routes/authRoutes");
const occupancyRoutes = require("./routes/occupancyRoutes");
const roomRoutes = require("../api/Room");
const paymentRoutes = require("../api/payment");
const dubaiPaymentRoutes = require("../api/dubaiPayment");
const dubaiPaymentDatabaseRoutes = require("./routes/dubaiPaymentDatabaseRoutes");
const paymentTeableRoutes = require("../api/payment-teable");
const roomsTeableRoutes = require("../api/rooms-teable");
const roomAvailabilityTeableRoutes = require("../api/room-availability-teable");
const roomDetailsTeableRoutes = require("../api/room-details-teable");
const monthlyTargetHandler = require("../api/monthly-target");
const dubaiDailyRevenueGetRoutes = require("../api/dubai-daily-revenue-get");
const cronDubaiRevenueHandler = require("../api/cron-dubai-revenue");
const cronDubaiMonthlyRevenueHandler = require("../api/cron-dubai-monthly-revenue");
const cronTeableReservationsHandler = require("../api/teable-reservations");
let hostawayCleaningStatusRoutes;
try {
  hostawayCleaningStatusRoutes = require("../api/hostawayCleaningStatusApi");
  console.log('✅ hostawayCleaningStatusRoutes loaded successfully');
} catch (error) {
  console.error('❌ Error loading hostawayCleaningStatusRoutes:', error.message);
  hostawayCleaningStatusRoutes = null;
}

let cleaningStatusOverridesRoutes;
try {
  cleaningStatusOverridesRoutes = require("../api/cleaningStatusOverrides");
  console.log('✅ cleaningStatusOverridesRoutes loaded successfully');
} catch (error) {
  console.error('❌ Error loading cleaningStatusOverridesRoutes:', error.message);
  cleaningStatusOverridesRoutes = null;
}

let listingNameMappingRoutes;
try {
  listingNameMappingRoutes = require("../api/listingNameMapping");
  console.log('✅ listingNameMappingRoutes loaded successfully');
  originalConsole.log('✅ listingNameMappingRoutes loaded successfully');
} catch (error) {
  console.error('❌ Error loading listingNameMappingRoutes:', error.message);
  originalConsole.error('❌ Error loading listingNameMappingRoutes:', error.message);
  originalConsole.error('❌ Full error:', error.stack);
  listingNameMappingRoutes = null;
}

let teableRoomRoutes;
try {
  teableRoomRoutes = require("../routes/teableRoomRoutes");
  console.log('✅ teableRoomRoutes loaded successfully');
  originalConsole.log('✅ teableRoomRoutes loaded successfully');
} catch (error) {
  console.error('❌ Error loading teableRoomRoutes:', error.message);
  originalConsole.error('❌ Error loading teableRoomRoutes:', error.message);
  teableRoomRoutes = null;
}

// Import RevenueTable integration
const { RevenueTableService } = require("../services/RevenueTable");

// Import and start scheduler
const schedulerService = require("./services/schedulerService");
const teableScheduler = require("./services/teableSchedulerService");

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Dashboard Backend API is running! 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    endpoints: {
      health: "/api/health",
      hello: "/api/hello",
      users: "/api/users",
      //  revenue: "/api/revenue",
      //revenueHealth: "/api/revenue/health",
      dubaiRevenue: "/api/dubai-revenue",
      dubaiRevenueListings: "/api/dubai-revenue/listings",
      dubaiRevenueHealth: "/api/dubai-revenue/health",
      teable: "/api/teable",
      teableStatus: "/api/teable/status",
      //monthlyTarget: "/api/monthly-target",
      auth: "/api/auth",
      //rooms: "/api/rooms",
      //occupancy: "/api/occupancy",
      //revenueTable: "/api/revenue-table",
      //revenueTableData: "/api/revenue-table/revenue-data",
      //revenueTableFastDashboard: "/api/revenue-table/fast-dashboard-data",
      //revenueTablePopulate: "/api/revenue-table/populate-initial",
      //listingRevenue: "/api/listing-revenue",
      //listingRevenueData: "/api/listing-revenue/listing-revenue-data",
      //listingRevenuePopulate: "/api/listing-revenue/populate-listing-initial",
      // roomsTeable: "/api/rooms-teable",
      // roomsTeableData: "/api/rooms-teable/data",
      // roomsTeableSync: "/api/rooms-teable/sync",
      //roomsTeableTest: "/api/rooms-teable/test",
      //roomAvailabilityTeable: "/api/room-availability-teable",
      //roomAvailabilityTeableData: "/api/room-availability-teable/data",
      //roomAvailabilityTeableSync: "/api/room-availability-teable/sync",
      //roomAvailabilityTeableTest: "/api/room-availability-teable/test",
      //roomDetailsTeable: "/api/room-details-teable",
      //roomDetailsTeableData: "/api/room-details-teable/data",
      //roomDetailsTeableSync: "/api/room-details-teable/sync",
      //roomDetailsTeableTest: "/api/room-details-teable/test"
    }
  });
});

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/revenue", revenueRoutes);
console.log('📍 Registering dubai-revenue routes...');
if (dubaiRevenueRoutes) {
  app.use("/api/dubai-revenue", dubaiRevenueRoutes);
  console.log('✅ dubai-revenue routes registered');
} else {
  console.error('❌ dubaiRevenueRoutes is null, not registering');
}
app.use("/api/teable", teableRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/occupancy", occupancyRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/dubai-payment", dubaiPaymentRoutes);
app.use("/api/dubai-payment", dubaiPaymentDatabaseRoutes);
app.use("/api/dubai-revenue", dubaiPaymentDatabaseRoutes);
app.use("/api/payment-teable", paymentTeableRoutes);
app.use("/api/rooms-teable", roomsTeableRoutes);
app.use("/api/room-availability-teable", roomAvailabilityTeableRoutes);
app.use("/api/room-details-teable", roomDetailsTeableRoutes);
app.use("/api/dubai-daily-revenue-get", dubaiDailyRevenueGetRoutes);
if (hostawayCleaningStatusRoutes) {
  app.use("/api/hostaway/cleaning-status", hostawayCleaningStatusRoutes);
  console.log('✅ hostaway cleaning status routes registered');
} else {
  console.warn('⚠️ hostaway cleaning status routes not available');
}

if (cleaningStatusOverridesRoutes) {
  app.use("/api/cleaning-status-overrides", cleaningStatusOverridesRoutes);
  console.log('✅ cleaning status overrides routes registered');
} else {
  console.warn('⚠️ cleaning status overrides routes not available');
}

if (listingNameMappingRoutes) {
  app.use("/api/listing-name-mapping", listingNameMappingRoutes);
  console.log('✅ listing name mapping routes registered');
  originalConsole.log('✅ listing name mapping routes registered');
} else {
  console.warn('⚠️ listing name mapping routes not available');
  originalConsole.warn('⚠️ listing name mapping routes not available');
}

if (teableRoomRoutes) {
  app.use("/api/teable-room", teableRoomRoutes);
  console.log('✅ teable room routes registered');
  originalConsole.log('✅ teable room routes registered');
} else {
  console.warn('⚠️ teable room routes not available');
  originalConsole.warn('⚠️ teable room routes not available');
}

// Cron job endpoint for Dubai daily revenue posting
app.post("/api/cron/post-dubai-revenue", cronDubaiRevenueHandler);

// Cron job endpoint for Dubai monthly revenue posting
app.post("/api/cron/post-dubai-monthly-revenue", cronDubaiMonthlyRevenueHandler);
app.all("/api/cron/teable-reservations", cronTeableReservationsHandler);

// RevenueTable API routes
//app.use("/api/revenue-table", RevenueTableService.createAPIRoutes());

// Listing Revenue API routes (same routes, different path)
//app.use("/api/listing-revenue", RevenueTableService.createAPIRoutes());

// Monthly target route
//app.all("/api/monthly-target", monthlyTargetHandler);

// Teable scheduler control endpoints
app.get("/api/teable-scheduler/status", (req, res) => {
  const status = teableScheduler.getStatus();
  res.json({
    success: true,
    ...status,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/teable-scheduler/start", (req, res) => {
  teableScheduler.start();
  res.json({
    success: true,
    message: "Teable scheduler started",
    status: teableScheduler.getStatus()
  });
});

app.post("/api/teable-scheduler/stop", (req, res) => {
  teableScheduler.stop();
  res.json({
    success: true,
    message: "Teable scheduler stopped",
    status: teableScheduler.getStatus()
  });
});

app.post("/api/teable-scheduler/sync-now", async (req, res) => {
  try {
    const result = await teableScheduler.performSync();
    res.json({
      success: true,
      message: "Manual sync completed",
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple test route
app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Backend 🚀",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Dashboard Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  // Log error safely without exposing sensitive data
  console.error('Global error handler:', getSafeError(error));

  // Handle missing environment variables gracefully
  if (error.message && error.message.includes('environment variable')) {
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable - configuration issue',
      details: config.NODE_ENV === 'development' ? error.message : 'Server configuration incomplete',
      timestamp: new Date().toISOString()
    });
  }

  // Handle network/API errors gracefully
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'External service unavailable',
      details: config.NODE_ENV === 'development' ? error.message : 'Unable to reach external service',
      timestamp: new Date().toISOString()
    });
  }

  res.status(error.status || 500).json({
    success: false,
    error: config.NODE_ENV === 'development' ? error.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start the schedulers automatically when the app is loaded
// BUT skip this on Vercel to prevent frozen functions or timeouts
if (!process.env.VERCEL) {
  setTimeout(() => {
    console.log('🚀 Starting Teable hourly scheduler automatically...');
    schedulerService.start();

    console.log('🚀 Starting Teable 10-minute auto-sync scheduler...');
    teableScheduler.start();
  }, 2000); // Wait 2 seconds after app initialization
}

module.exports = app;
