const express = require('express');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/authenticate');
const { calculateReliability } = require('../utils/scheduleHelpers');
const router = express.Router();

// POST /api/journeywatch
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { train_id, travel_date } = req.body;

        if (!train_id || !travel_date) {
            return res.status(400).json({ error: 'train_id and travel_date are required' });
        }

        // Get schedule for this train
        const scheduleRes = await pool.query(
            'SELECT id FROM Schedule WHERE train_id = $1 AND active = TRUE LIMIT 1',
            [train_id]
        );

        if (scheduleRes.rows.length === 0) {
            return res.status(404).json({ error: 'No active schedule found for this train' });
        }
        const schedule_id = scheduleRes.rows[0].id;

        // Find from_station_id (first stop) and to_station_id (last stop)
        const timingRes = await pool.query(`
            SELECT station_id, stop_sequence 
            FROM ScheduleStationTiming 
            WHERE schedule_id = $1 
            ORDER BY stop_sequence ASC
        `, [schedule_id]);

        if (timingRes.rows.length < 2) {
            return res.status(400).json({ error: 'Invalid schedule timing data' });
        }

        const from_station_id = timingRes.rows[0].station_id;
        const to_station_id = timingRes.rows[timingRes.rows.length - 1].station_id;

        // Check if entry already exists
        const checkRes = await pool.query(`
            SELECT id FROM JourneyWatch 
            WHERE user_id = $1 AND schedule_id = $2 AND watch_date = $3
        `, [req.user.userId, schedule_id, travel_date]);

        if (checkRes.rows.length > 0) {
            return res.status(409).json({ message: 'Already watching this train' });
        }

        // Insert new entry
        const insertRes = await pool.query(`
            INSERT INTO JourneyWatch 
                (user_id, schedule_id, from_station_id, to_station_id, watch_date, active) 
            VALUES ($1, $2, $3, $4, $5, TRUE)
            RETURNING id
        `, [req.user.userId, schedule_id, from_station_id, to_station_id, travel_date]);

        res.status(201).json({ message: 'Created', id: insertRes.rows[0].id });
    } catch (error) {
        console.error('JourneyWatch POST error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/journeywatch
router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                jw.id, 
                s.id AS schedule_id,
                t.name AS train_name, 
                t.number AS train_number, 
                t.id AS train_id,
                st_from.name AS from_station_name,
                st_to.name AS to_station_name,
                sst.departure_time, 
                COALESCE(tsu.status, 'On Time') AS current_status, 
                COALESCE(tsu.delay_minutes, 0) AS delay_minutes,
                jw.notify_delays,
                jw.notify_departure,
                jw.notify_cancellations,
                jw.watch_date
            FROM JourneyWatch jw
            JOIN Schedule s ON jw.schedule_id = s.id
            JOIN Train t ON s.train_id = t.id
            JOIN Station st_from ON jw.from_station_id = st_from.id
            JOIN Station st_to ON jw.to_station_id = st_to.id
            JOIN ScheduleStationTiming sst ON sst.schedule_id = s.id AND sst.station_id = jw.from_station_id
            LEFT JOIN TripStatusUpdate tsu ON tsu.schedule_id = s.id AND tsu.trip_date = jw.watch_date
            WHERE jw.user_id = $1 AND jw.active = TRUE
            ORDER BY sst.departure_time ASC
        `;
        const result = await pool.query(query, [req.user.userId]);

        if (result.rows.length === 0) {
            return res.json([]);
        }

        const scheduleIds = result.rows.map(row => row.schedule_id);
        const reliabilityData = await calculateReliability(pool, scheduleIds);

        const watches = result.rows.map(row => ({
            ...row,
            reliability: reliabilityData[row.schedule_id] || { reliability: 'medium', punctuality_percent: 0, total_trips: 0 }
        }));

        res.json(watches);
    } catch (error) {
        console.error('JourneyWatch GET error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/journeywatch/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const watchRes = await pool.query('SELECT user_id FROM JourneyWatch WHERE id = $1', [id]);
        if (watchRes.rows.length === 0) {
            return res.status(404).json({ error: 'Watch entry not found' });
        }

        if (watchRes.rows[0].user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden: Cannot delete watch entry of another user' });
        }

        await pool.query('DELETE FROM JourneyWatch WHERE id = $1', [id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('JourneyWatch DELETE error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/journeywatch/:id/notifications
router.patch('/:id/notifications', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { notify_delays, notify_departure, notify_cancellations } = req.body;

        const watchRes = await pool.query('SELECT user_id FROM JourneyWatch WHERE id = $1', [id]);
        if (watchRes.rows.length === 0) {
            return res.status(404).json({ error: 'Watch entry not found' });
        }
        if (watchRes.rows[0].user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await pool.query(`
            UPDATE JourneyWatch 
            SET notify_delays = COALESCE($1, notify_delays),
                notify_departure = COALESCE($2, notify_departure),
                notify_cancellations = COALESCE($3, notify_cancellations)
            WHERE id = $4
        `, [notify_delays, notify_departure, notify_cancellations, id]);

        res.json({ message: 'Notification preferences updated' });
    } catch (error) {
        console.error('JourneyWatch PATCH error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/journeywatch/check
router.get('/check', authenticateToken, async (req, res) => {
    try {
        const { train_id } = req.query;
        if (!train_id) {
            return res.status(400).json({ error: 'train_id required' });
        }

        // Just get the current date for checking if it's watched today
        const travel_date = new Date().toISOString().split('T')[0];

        const scheduleRes = await pool.query('SELECT id FROM Schedule WHERE train_id = $1 LIMIT 1', [train_id]);
        if (scheduleRes.rows.length === 0) return res.json({ watched: false });
        
        const schedule_id = scheduleRes.rows[0].id;

        const checkRes = await pool.query(`
            SELECT id FROM JourneyWatch 
            WHERE user_id = $1 AND schedule_id = $2 AND watch_date = $3
        `, [req.user.userId, schedule_id, travel_date]);

        res.json({ watched: checkRes.rows.length > 0 });
    } catch (error) {
        console.error('JourneyWatch check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
