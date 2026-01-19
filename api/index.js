console.log('🚀 API PROBE Loaded');

// Vercel serverless function handler - PROBE ONLY
module.exports = (req, res) => {
    console.log(`📨 PROBE Request received: ${req.method} ${req.url}`);

    // PROBE: Return simple JSON to verify connectivity
    res.status(200).json({
        status: "PROBE WORKS",
        message: "If you see this, Vercel API routing is CORRECT.",
        url_received: req.url,
        method: req.method,
        env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL
    });
};
