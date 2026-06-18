const pool = require('../db/pool');

/**
 * Reliability Cache Refresh Job
 * Pre-computes per-schedule reliability scores every 10 minutes
 * so schedule search and disruptions endpoints don't run a full
 * GROUP BY aggregation on every request.
 */
async function refreshReliabilityCache() {
    try {
        await pool.query(`
            INSERT INTO schedule_reliability_cache
                (schedule_id, reliability_percent, total_records, avg_delay_minutes, last_computed_at)
            SELECT
                schedule_id,
                ROUND(
                    COUNT(CASE WHEN status = 'ON_TIME' THEN 1 END)::DECIMAL
                    / NULLIF(COUNT(*), 0)::DECIMAL * 100
                )::INTEGER,
                COUNT(*)::INTEGER,
                COALESCE(ROUND(AVG(delay_minutes)), 0)::INTEGER,
                NOW()
            FROM trip_status_updates
            GROUP BY schedule_id
            ON CONFLICT (schedule_id) DO UPDATE SET
                reliability_percent = EXCLUDED.reliability_percent,
                total_records       = EXCLUDED.total_records,
                avg_delay_minutes   = EXCLUDED.avg_delay_minutes,
                last_computed_at    = NOW()
        `);
        console.log(`[RELIABILITY] Cache refreshed at ${new Date().toISOString()}`);
    } catch (err) {
        console.error('[RELIABILITY] Cache refresh error:', err.message);
    }
}

function startReliabilityJob() {
    refreshReliabilityCache(); // run immediately on boot
    setInterval(refreshReliabilityCache, 10 * 60 * 1000); // every 10 minutes
    console.log('[RELIABILITY] Reliability cache job started — refreshing every 10 minutes');
}

module.exports = { startReliabilityJob, refreshReliabilityCache };
