const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = parts[1];

    // Check token blacklist
    try {
        const pool = require('../db/pool');
        const blacklisted = await pool.query(
            'SELECT 1 FROM token_blacklist WHERE token_hash = $1',
            [hashToken(token)]
        );
        if (blacklisted.rows.length > 0) {
            return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
        }
    } catch (err) {
        // If the blacklist table doesn't exist yet, proceed without blocking (mainly for early migrations/tests)
        if (err.code === '42P01') {
            // proceed
        } else {
            console.error('Token blacklist check error:', err.message);
            return res.status(503).json({ error: 'Authentication service temporarily unavailable' });
        }
    }

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            sub_role: decoded.sub_role || null,
            home_station_id: decoded.home_station_id || null
        };
        next();
    });
};
