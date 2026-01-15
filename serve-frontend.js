const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Security and performance middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // CORS headers for API requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Serve static files from the React app build directory with proper headers
app.use(express.static(path.join(__dirname, 'frontend/build'), {
  maxAge: '1d', // Cache static files for 1 day
  setHeaders: (res, filePath) => {
    // Set proper MIME types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'frontend-server'
  });
});

// API routes (proxy to your backend)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  timeout: 30000, // 30 second timeout
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({
      success: false,
      error: 'Backend server unavailable',
      message: 'Unable to connect to API server'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to backend`);
  }
}));

// Hostaway API proxy (to avoid CORS issues)
app.use('/hostaway', createProxyMiddleware({
  target: 'https://api.hostaway.com',
  changeOrigin: true,
  pathRewrite: {
    '^/hostaway': '' // Remove /hostaway prefix when forwarding
  },
  timeout: 30000,
  onError: (err, req, res) => {
    console.error('Hostaway proxy error:', err.message);
    res.status(502).json({
      success: false,
      error: 'Hostaway API unavailable',
      message: 'Unable to connect to Hostaway API'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to Hostaway API`);
  }
}));

// CRON ENDPOINT: Trigger Charges Sync
const runDubaiChargesSync = require('./backend/api/cron-dubai-charges');

app.get('/api/cron/charges', async (req, res) => {
  console.log('Manual Trigger: Dubai Charges Sync');
  try {
    await runDubaiChargesSync();
    res.json({ success: true, message: 'Sync job finished successfully' });
  } catch (error) {
    console.error('Sync Job Failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle React routing - MUST be last
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'frontend/build', 'index.html');

  // Check if index.html exists
  const fs = require('fs');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).json({
      error: 'React app not built',
      message: 'Please run "npm run build" in the frontend directory',
      path: indexPath
    });
  }

  // Set proper content type for HTML
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${port}`);
  console.log(`📍 Local: http://localhost:${port}`);
  console.log(`🌐 Network: http://0.0.0.0:${port}`);
  console.log(`📁 Serving: ${path.join(__dirname, 'frontend/build')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
