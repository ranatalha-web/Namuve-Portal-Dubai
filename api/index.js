console.log('🚀 API Entry Point Loaded');

let app;

try {
    console.log('📥 Requiring Backend App...');
    app = require('../backend/src/app');
    console.log('✅ Backend App Required Successfully');
} catch (error) {
    console.error('❌ FAILED to require backend/src/app:', error);
    // Export a simple error handler if app fails to load
    module.exports = (req, res) => {
        res.status(500).json({
            error: 'Backend Initialization Failed',
            message: error.message,
            stack: error.stack
        });
    };
    return;
}

// Vercel serverless function handler
module.exports = (req, res) => {
    console.log(`📨 Request received: ${req.method} ${req.url}`);
    // Pass to Express app
    return app(req, res);
};
