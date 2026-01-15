const { createProxyMiddleware } = require('http-proxy-middleware');
const runDubaiChargesSync = require('../../backend/api/cron-dubai-charges');

module.exports = function (app) {
    // Proxy for Hostaway API (if needed)
    app.use(
        '/hostaway',
        createProxyMiddleware({
            target: 'https://api.hostaway.com',
            changeOrigin: true,
            pathRewrite: {
                '^/hostaway': '',
            },
            onProxyReq: (proxyReq) => {
                // Optional: Log proxy requests
                // console.log('Proxying request to Hostaway:', proxyReq.path);
            }
        })
    );

    // Custom Endpoint to Trigger Sync from n8n
    app.get('/api/cron/charges', (req, res) => {
        console.log('Manual Trigger: Dubai Charges Sync');

        // Respond immediately to prevent timeout
        res.json({ success: true, message: 'Sync job started in background' });

        // Run job asynchronously
        runDubaiChargesSync().catch(error => {
            console.error('Sync Job Failed:', error);
        });
    });
};
