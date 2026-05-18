const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

// POST /
router.post('/', authenticate, async (req, res) => {
    try {
        const { schedule_id } = req.body;

        if (!schedule_id) {
            return res.status(400).json({ error: 'schedule_id is required' });
        }

        // Check if schedule exists
        const schedResult = await pool.query('SELECT id FROM schedules WHERE id = $1', [schedule_id]);
        if (schedResult.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Check duplicate
        const dupResult = await pool.query(
            'SELECT id FROM journey_watches WHERE user_id = $1 AND schedule_id = $2',
            [req.user.userId, schedule_id]
        );
        if (dupResult.rows.length > 0) {
            return res.status(409).json({ error: 'Already watching this train' });
        }

        // Insert watch
        const insertResult = await pool.query(
            'INSERT INTO journey_watches (user_id, schedule_id) VALUES ($1, $2) RETURNING id, schedule_id as "scheduleId", created_at as "createdAt"',
            [req.user.userId, schedule_id]
        );

        return res.status(201).json({
            message: 'Journey watch added',
            watch: insertResult.rows[0]
        });
    } catch (error) {
        console.error('Add watch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                w.id,
                w.schedule_id as "scheduleId",
                s.train_number as "trainNumber",
                s.train_name as "trainName",
                sf.name as "fromStation",
                st.name as "toStation",
                s.departure_time as "departureTime",
                s.arrival_time as "arrivalTime",
                COALESCE(u.status, 'ON_TIME') as "liveStatus",
                COALESCE(u.delay_minutes, 0) as "delayMinutes"
             FROM journey_watches w
             JOIN schedules s ON w.schedule_id = s.id
             JOIN stations sf ON s.from_station_id = sf.id
             JOIN stations st ON s.to_station_id = st.id
             LEFT JOIN trip_status_updates u ON u.schedule_id = s.id AND u.trip_date = CURRENT_DATE
             WHERE w.user_id = $1`,
            [req.user.userId]
        );

        // Supporting both { watches: [...] } and { trains: [...] } for compatibility
        return res.status(200).json({
            watches: result.rows,
            trains: result.rows
        });
    } catch (error) {
        console.error('Get watches error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const watchId = parseInt(req.params.id, 10);
        if (isNaN(watchId)) {
            return res.status(400).json({ error: 'Invalid watch ID' });
        }

        // Check ownership & existence
        const checkResult = await pool.query(
            'SELECT user_id FROM journey_watches WHERE id = $1',
            [watchId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Watch not found' });
        }

        if (checkResult.rows[0].user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorised' });
        }

        // Delete
        await pool.query('DELETE FROM journey_watches WHERE id = $1', [watchId]);
        return res.status(200).json({ message: 'Watch removed' });
    } catch (error) {
        console.error('Delete watch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
