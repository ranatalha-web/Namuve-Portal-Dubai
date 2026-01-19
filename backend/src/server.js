// Clean server startup

// Load environment variables - Vercel handles this automatically in production
if (process.env.NODE_ENV !== 'production') {
  require("dotenv").config({ path: "../.env" });
}

const app = require("./app");
const schedulerService = require("./services/schedulerService");
const { initializeMonthlyTargetScheduler } = require("./services/revenueService");
const { RevenueTableService } = require("../services/RevenueTable");

const PORT = process.env.PORT || 5000;

// Vercel serverless environment check
if (process.env.VERCEL) {
  // We are on Vercel, just export the app
  module.exports = app;
} else {
  // We are NOT on Vercel (Local or Digital Ocean), start the server
  const server = app.listen(PORT, () => {
    // Silent server startup

    // Initialize monthly target scheduler
    initializeMonthlyTargetScheduler();

    // Initialize RevenueTable automatic updates
    const revenueTableService = new RevenueTableService();
    revenueTableService.startAutomaticUpdates(20); // Every 20 minutes
  });

  // Add error handling for server startup
  server.on('error', (error) => {
    // Silent error handling
  });

  // Graceful shutdown
  let isShuttingDown = false;

  const gracefulShutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    // Stop scheduler first
    schedulerService.stop();

    // Close server
    server.close(() => {
      process.exit(0);
    });

    // Force close after 5 seconds
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  };

  // Remove all existing listeners first
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');

  // Add our handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  module.exports = app;
}