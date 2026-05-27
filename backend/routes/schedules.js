const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /search
router.get('/search', async (req, res) => {
    try {
        const { from, to, date, class: trainClass } = req.query;

        // Support "all schedules" mode when from/to are empty (used by staff GPS assignment)
        const hasFrom = from && from.trim() !== '';
        const hasTo = to && to.trim() !== '';
        const isAllMode = !hasFrom && !hasTo;

        if (!isAllMode && (!hasFrom || !hasTo)) {
            return res.status(400).json({ error: 'Both from and to query parameters are required' });
        }

        const tripDate = date || new Date().toISOString().split('T')[0];

        let query, params;

        if (isAllMode) {
            query = `
                SELECT 
                    s.id,
                    s.train_number as "trainNumber",
                    s.train_name as "trainName",
                    sf.code as "fromStation",
                    st.code as "toStation",
                    sf.id as "fromStationId",
                    st.id as "toStationId",
                    s.departure_time as "departureTime",
                    s.arrival_time as "arrivalTime",
                    s.class,
                    'ON_TIME' as "liveStatus",
                    0 as "delayMinutes"
                FROM schedules s
                JOIN stations sf ON s.from_station_id = sf.id
                JOIN stations st ON s.to_station_id = st.id
                WHERE s.is_active = true
                ORDER BY s.train_number ASC
            `;
            params = [];
        } else {
            query = `
                SELECT 
                    s.id,
                    s.train_number as "trainNumber",
                    s.train_name as "trainName",
                    sf.name as "fromStation",
                    st.name as "toStation",
                    s.departure_time as "departureTime",
                    s.arrival_time as "arrivalTime",
                    s.class,
                    COALESCE(u.status, 'ON_TIME') as "liveStatus",
                    COALESCE(u.delay_minutes, 0) as "delayMinutes",
                    rel.reliability_percent as "reliabilityPercent"
                FROM schedules s
                JOIN stations sf ON s.from_station_id = sf.id
                JOIN stations st ON s.to_station_id = st.id
                LEFT JOIN trip_status_updates u ON u.schedule_id = s.id AND u.trip_date = $1
                LEFT JOIN (
                    SELECT 
                        schedule_id, 
                        ROUND(COUNT(CASE WHEN status = 'ON_TIME' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100) as reliability_percent
                    FROM trip_status_updates
                    GROUP BY schedule_id
                ) rel ON rel.schedule_id = s.id
                WHERE sf.code ILIKE $2 AND st.code ILIKE $3 AND s.is_active = true
            `;
            params = [tripDate, from, to];

            if (trainClass && trainClass !== 'all' && trainClass !== '') {
                query += ` AND s.class = $4`;
                params.push(trainClass);
            }
        }

        const result = await pool.query(query, params);

        const schedules = result.rows.map(row => {
            const relPercent = row.reliabilityPercent === null ? null : Number(row.reliabilityPercent);
            let reliability = 'NO_DATA';

            if (relPercent !== null) {
                if (relPercent >= 80) {
                    reliability = 'USUALLY_ON_TIME';
                } else if (relPercent >= 50) {
                    reliability = 'SOMETIMES_DELAYED';
                } else {
                    reliability = 'OFTEN_LATE';
                }
            }

            return {
                id: row.id,
                trainNumber: row.trainNumber,
                trainName: row.trainName,
                fromStation: row.fromStation,
                toStation: row.toStation,
                fromStationId: row.fromStationId,
                toStationId: row.toStationId,
                departureTime: row.departureTime,
                arrivalTime: row.arrivalTime,
                class: row.class,
                liveStatus: row.liveStatus,
                delayMinutes: Number(row.delayMinutes || 0),
                reliability,
                reliabilityPercent: relPercent
            };
        });

        return res.status(200).json({ schedules, count: schedules.length });
    } catch (error) {
        console.error('Search schedules error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /:id/route
router.get('/:id/route', async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id, 10);
        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule ID' });
        }

        const result = await pool.query(
            `SELECT stop_sequence as sequence, station_name as "stationName", 
             scheduled_time as "scheduledTime", platform 
             FROM stop_times 
             WHERE schedule_id = $1 
             ORDER BY stop_sequence ASC`,
            [scheduleId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found or no route stops available' });
        }

        return res.status(200).json({
            scheduleId,
            stops: result.rows
        });
    } catch (error) {
        console.error('Get route stops error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /:id
router.get('/:id', async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id, 10);
        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule ID' });
        }

        const result = await pool.query(
            `SELECT s.id, s.train_number as "trainNumber", s.train_name as "trainName",
             sf.name as "fromStation", st.name as "toStation",
             s.departure_time as "departureTime", s.arrival_time as "arrivalTime",
             s.class, s.days_of_week as "daysOfWeek", s.is_active as "isActive"
             FROM schedules s
             JOIN stations sf ON s.from_station_id = sf.id
             JOIN stations st ON s.to_station_id = st.id
             WHERE s.id = $1`,
            [scheduleId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Get schedule error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
