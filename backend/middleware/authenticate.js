const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// In-memory revocation cache — avoids a DB hit on every authenticated request.
// Warmed at startup from recently revoked tokens; updated synchronously on logout.
// ---------------------------------------------------------------------------
const revokedTokenCache = new Set();
const CACHE_MAX_SIZE = 10000;

async function warmRevocationCache() {
    try {
        const pool = require('../db/pool');
        const result = await pool.query(
            "SELECT token_hash FROM token_blacklist WHERE created_at > NOW() - INTERVAL '8 days'"
        );
        result.rows.forEach(r => revokedTokenCache.add(r.token_hash));
        console.log(`[AUTH] Revocation cache warmed: ${revokedTokenCache.size} entries`);
    } catch (e) {
        console.warn('[AUTH] Could not warm revocation cache (table may not exist yet):', e.message);
    }
}
warmRevocationCache();

function addToRevocationCache(hash) {
    if (revokedTokenCache.size < CACHE_MAX_SIZE) revokedTokenCache.add(hash);
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

    // Check revocation: fast in-memory cache first, DB fallback on miss
    const tokenHash = hashToken(token);
    if (revokedTokenCache.has(tokenHash)) {
        return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }
    try {
        const pool = require('../db/pool');
        const blacklisted = await pool.query(
            'SELECT 1 FROM token_blacklist WHERE token_hash = $1',
            [tokenHash]
        );
        if (blacklisted.rows.length > 0) {
            addToRevocationCache(tokenHash); // backfill cache for next request
            return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
        }
    } catch (err) {
        // If the blacklist table doesn't exist yet, proceed without blocking
        if (err.code !== '42P01') {
            console.error('Token blacklist check error:', err.message);
            return res.status(503).json({ error: 'Authentication service temporarily unavailable' });
        }
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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

module.exports.hashToken = hashToken;
module.exports.addToRevocationCache = addToRevocationCache;
