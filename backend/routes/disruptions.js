const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET / — disrupted schedules (reliability < 60% or cancelled today)
// Uses pre-computed schedule_reliability_cache — no inline GROUP BY
router.get('/', async (req, res, next) => {
    try {
        const query = `
            SELECT 
                s.id as "scheduleId",
                s.train_number as "trainNumber",
                s.train_name as "trainName",
                sf.name as "fromStation",
                st.name as "toStation",
                COALESCE(rel.reliability_percent, 100) as "reliabilityPercent",
                COALESCE(rel.total_records, 0) as "totalRecords",
                COALESCE(rel.avg_delay_minutes, 0) as "avgDelayMinutes",
                COALESCE(u.status, 'ON_TIME') as "todayStatus"
            FROM schedules s
            JOIN stations sf ON s.from_station_id = sf.id
            JOIN stations st ON s.to_station_id = st.id
            LEFT JOIN trip_status_updates u ON u.schedule_id = s.id AND u.trip_date = CURRENT_DATE
            LEFT JOIN schedule_reliability_cache rel ON rel.schedule_id = s.id
            WHERE (rel.reliability_percent < 60 AND rel.total_records > 0)
               OR u.status = 'CANCELLED'
        `;

        const result = await pool.query(query);

        const disruptions = result.rows.map(row => {
            const reliabilityPercent = Number(row.reliabilityPercent);
            let tier = 'high';
            let label = 'Reliable';
            if (reliabilityPercent < 50) {
                tier = 'low';
                label = 'Unreliable';
            } else if (reliabilityPercent < 80) {
                tier = 'medium';
                label = 'Moderate';
            }

            return {
                scheduleId: Number(row.scheduleId),
                trainNumber: row.trainNumber,
                trainName: row.trainName,
                fromStation: row.fromStation,
                toStation: row.toStation,
                reliabilityPercent: reliabilityPercent,
                totalRecords: Number(row.totalRecords),
                todayStatus: row.todayStatus,
                train_name: row.trainName,
                train_number: row.trainNumber,
                train_type: row.trainName.includes('Intercity') ? 'Intercity' : 'Express',
                reliability: {
                    tier: tier,
                    label: `${reliabilityPercent}% (${label})`
                },
                stats: {
                    reliability_score: reliabilityPercent,
                    avg_delay_minutes: Number(row.avgDelayMinutes || 0),
                    total_trips: Number(row.totalRecords)
                }
            };
        });

        return res.status(200).json({
            disruptions,
            trains: disruptions,
            count: disruptions.length
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
