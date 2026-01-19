/**
 * Localhost-Only Middleware
 * 
 * This middleware ensures that certain sensitive endpoints
 * can ONLY be accessed from localhost (127.0.0.1 or ::1)
 * 
 * Use this for password decryption endpoints to prevent
 * production server access
 */

const localhostOnly = (req, res, next) => {
    // Get the client IP address
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Normalize IPv6 localhost to IPv4
    const normalizedIp = clientIp.replace(/^::ffff:/, '');

    // List of allowed localhost addresses
    const localhostAddresses = [
        '127.0.0.1',
        '::1',
        'localhost'
    ];

    // Check if request is from localhost
    const isLocalhost = localhostAddresses.some(addr =>
        normalizedIp === addr || normalizedIp.includes(addr)
    );

    // Additional check: ensure we're not in production or the host is localhost
    const host = req.get('host') || '';
    const isLocalhostHost = host.startsWith('localhost') || host.startsWith('127.0.0.1');

    if (isLocalhost || isLocalhostHost) {
        console.log(`✅ Localhost access granted from: ${normalizedIp}`);
        return next();
    }

    // Log unauthorized access attempt
    console.warn(`⚠️  BLOCKED: Attempted access to localhost-only endpoint from: ${normalizedIp}`);
    console.warn(`⚠️  Host: ${host}`);
    console.warn(`⚠️  Endpoint: ${req.path}`);

    // Return 403 Forbidden
    return res.status(403).json({
        success: false,
        message: 'This endpoint is only accessible from localhost for security reasons',
        error: 'Access denied: localhost-only endpoint'
    });
};

module.exports = localhostOnly;
