const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(proxy, allowedHost) {
  return {
    // Disable WebSocket connection to prevent connection errors
    webSocketServer: false,
    client: {
      webSocketURL: 'ws://localhost:3000/ws',
      // Disable overlay for WebSocket connection errors
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: false,
      },
    },
    // Setup proxy for API calls
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Proxy API calls to backend
      devServer.app.use(
        '/api',
        createProxyMiddleware({
          target: 'http://localhost:5000',
          changeOrigin: true,
          timeout: 30000, // 30 second timeout
          proxyTimeout: 30000,
          onError: (err, req, res) => {
            console.log('Proxy Error:', err.message);
            // Don't crash on proxy errors
          },
          logLevel: 'silent' // Reduce proxy error logs
        })
      );

      return middlewares;
    },
  };
};
