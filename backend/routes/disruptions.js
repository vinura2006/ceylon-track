const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

// GET /
router.get('/', authenticate, async (req, res) => {
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
                COALESCE(u.status, 'ON_TIME') as "todayStatus"
            FROM schedules s
            JOIN stations sf ON s.from_station_id = sf.id
            JOIN stations st ON s.to_station_id = st.id
            LEFT JOIN trip_status_updates u ON u.schedule_id = s.id AND u.trip_date = CURRENT_DATE
            LEFT JOIN (
                SELECT 
                    schedule_id, 
                    ROUND(COUNT(CASE WHEN status = 'ON_TIME' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100) as reliability_percent,
                    COUNT(*) as total_records
                FROM trip_status_updates
                GROUP BY schedule_id
            ) rel ON rel.schedule_id = s.id
            WHERE (rel.reliability_percent < 60 AND rel.total_records > 0)
               OR u.status = 'CANCELLED'
        `;

        const result = await pool.query(query);

        const disruptions = result.rows.map(row => ({
            scheduleId: Number(row.scheduleId),
            trainNumber: row.trainNumber,
            trainName: row.trainName,
            fromStation: row.fromStation,
            toStation: row.toStation,
            reliabilityPercent: Number(row.reliabilityPercent),
            totalRecords: Number(row.totalRecords),
            todayStatus: row.todayStatus
        }));

        return res.status(200).json({
            disruptions,
            count: disruptions.length
        });
    } catch (error) {
        console.error('Get disruptions error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
