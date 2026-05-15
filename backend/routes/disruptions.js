const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

/**
 * GET /api/disruptions
 * Returns reliability analysis for all trains based on TripStatusUpdate records.
 * Groups by train, calculating on-time rate, average delay, and reliability tier.
 */
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT
                t.id                                            AS train_id,
                t.name                                          AS train_name,
                t.number                                        AS train_number,
                t.type                                          AS train_type,
                COUNT(tsu.id)                                   AS total_trips,
                SUM(CASE WHEN tsu.delay_minutes <= 5 THEN 1 ELSE 0 END)
                                                                AS on_time_trips,
                SUM(CASE WHEN tsu.status = 'Cancelled' THEN 1 ELSE 0 END)
                                                                AS cancelled_trips,
                ROUND(AVG(tsu.delay_minutes)::numeric, 1)       AS avg_delay_minutes,
                MAX(tsu.delay_minutes)                          AS max_delay_minutes,
                CASE
                    WHEN COUNT(tsu.id) = 0 THEN 0
                    ELSE ROUND(
                        (SUM(CASE WHEN tsu.delay_minutes <= 5 THEN 1 ELSE 0 END)::numeric
                         / COUNT(tsu.id)) * 100, 1
                    )
                END                                             AS reliability_score
            FROM Train t
            LEFT JOIN Schedule s        ON s.train_id = t.id AND s.active = TRUE
            LEFT JOIN TripStatusUpdate tsu ON tsu.schedule_id = s.id
                AND tsu.trip_date >= CURRENT_DATE - INTERVAL '30 days'
            WHERE t.active = TRUE
            GROUP BY t.id, t.name, t.number, t.type
            ORDER BY reliability_score ASC NULLS LAST, total_trips DESC
        `;

        const result = await pool.query(query);

        const trains = result.rows.map(row => {
            const score = parseFloat(row.reliability_score) || 0;
            const totalTrips = parseInt(row.total_trips) || 0;

            let reliability_tier = 'no_data';
            let tier_label = 'No Data';
            let tier_color = 'gray';

            if (totalTrips > 0) {
                if (score >= 80) {
                    reliability_tier = 'high';
                    tier_label = 'Reliable';
                    tier_color = 'green';
                } else if (score >= 50) {
                    reliability_tier = 'medium';
                    tier_label = 'Moderate';
                    tier_color = 'amber';
                } else {
                    reliability_tier = 'low';
                    tier_label = 'Unreliable';
                    tier_color = 'red';
                }
            }

            return {
                train_id: row.train_id,
                train_name: row.train_name,
                train_number: row.train_number,
                train_type: row.train_type,
                stats: {
                    total_trips: totalTrips,
                    on_time_trips: parseInt(row.on_time_trips) || 0,
                    cancelled_trips: parseInt(row.cancelled_trips) || 0,
                    avg_delay_minutes: parseFloat(row.avg_delay_minutes) || 0,
                    max_delay_minutes: parseInt(row.max_delay_minutes) || 0,
                    reliability_score: score
                },
                reliability: {
                    tier: reliability_tier,
                    label: tier_label,
                    color: tier_color
                }
            };
        });

        res.json({
            generated_at: new Date().toISOString(),
            period: 'Last 30 days',
            count: trains.length,
            trains
        });

    } catch (err) {
        console.error('GET /api/disruptions error:', err);
        res.status(500).json({ error: 'Failed to fetch disruption data', details: err.message });
    }
});

module.exports = router;
