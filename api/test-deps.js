module.exports = (req, res) => {
    try {
        const express = require('express');
        const path = require('path');
        const dotenv = require('dotenv');

        // Check if we can find the backend app file
        const appPath = path.resolve(__dirname, '../backend/src/app.js');
        const fs = require('fs');
        const appExists = fs.existsSync(appPath);

        res.status(200).json({
            status: "success",
            message: "Dependencies loaded successfully!",
            express_version: require('../backend/package.json').dependencies.express,
            app_file_exists: appExists,
            app_path: appPath,
            cwd: process.cwd()
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to load dependencies",
            error: error.message,
            stack: error.stack
        });
    }
};
