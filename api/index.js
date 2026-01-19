module.exports = async (req, res) => {
    // Load the Express app
    const app = require('../backend/src/app');

    // Let Express handle the request
    return app(req, res);
};
