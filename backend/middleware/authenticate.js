const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ceylon_track_secret_key_2024';

/**
 * authenticateToken - Express middleware
 * Validates the JWT bearer token from the Authorization header.
 * Attaches the decoded user payload to req.user if valid.
 * Returns 401 if no token is provided, 403 if the token is invalid or expired.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Access denied. No token provided.'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'Invalid or expired token.'
            });
        }
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken };
