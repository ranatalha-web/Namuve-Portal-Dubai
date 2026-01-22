module.exports = async (req, res) => {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        // Load environment variables for Vercel
        if (process.env.VERCEL) {
            process.env.NODE_ENV = 'production';
        }

        // Load the Express app
        const app = require('../backend/src/app');

        // Pass request to Express
        return app(req, res);
    } catch (error) {
        console.error('API Handler Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
