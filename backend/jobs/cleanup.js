const pool = require('../db/pool');

/**
 * Daily cleanup job — purges stale security data and old GPS records.
 * Runs once at midnight, then every 24 hours.
 */
async function runCleanup() {
    console.log(`[CLEANUP] Starting daily cleanup at ${new Date().toISOString()}`);
    try {
        // 1. Expired/revoked refresh tokens older than 8 days
        const rt = await pool.query(
            "DELETE FROM refresh_tokens WHERE revoked = true AND created_at < NOW() - INTERVAL '8 days'"
        );
        console.log(`[CLEANUP] Removed ${rt.rowCount} expired refresh tokens`);

        // 2. Blacklisted access tokens (JWTs expire in 15m; purge after 1 hour)
        const bl = await pool.query(
            "DELETE FROM token_blacklist WHERE created_at < NOW() - INTERVAL '1 hour'"
        );
        console.log(`[CLEANUP] Removed ${bl.rowCount} stale blacklist entries`);

        // 3. Old login attempt records where lockout has expired
        const la = await pool.query(
            "DELETE FROM login_attempts WHERE last_attempt_at < NOW() - INTERVAL '24 hours' AND (lockout_until IS NULL OR lockout_until < NOW())"
        );
        console.log(`[CLEANUP] Removed ${la.rowCount} old login attempt records`);

        // 4. Old GPS/status data (keep 30 days of history)
        const tsu = await pool.query(
            "DELETE FROM trip_status_updates WHERE trip_date < CURRENT_DATE - INTERVAL '30 days'"
        );
        console.log(`[CLEANUP] Removed ${tsu.rowCount} old trip status records`);

        console.log(`[CLEANUP] Daily cleanup completed successfully at ${new Date().toISOString()}`);
    } catch (err) {
        console.error('[CLEANUP] Error during cleanup:', err.message);
    }
}

function startCleanupJob() {
    // Schedule first run at the next midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight - now;

    console.log(`[CLEANUP] Daily cleanup job scheduled — first run in ${Math.round(msUntilMidnight / 60000)} minutes`);

    setTimeout(() => {
        runCleanup();
        setInterval(runCleanup, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
}

module.exports = { startCleanupJob, runCleanup };
