const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { logAction } = require('../utils/auditLogger');

// POST /start — staff starts GPS sharing
router.post('/start', authenticate, authorize(['staff', 'admin', 'ceylon-track-admin']), async (req, res, next) => {
    try {
        const { schedule_id } = req.body;
        if (!schedule_id) return res.status(400).json({ error: 'schedule_id required' });

        if (req.user.sub_role === 'station_master') {
            return res.status(403).json({ error: 'Station masters cannot broadcast GPS' });
        }

        // Check train existence
        const train = await pool.query('SELECT id FROM schedules WHERE id = $1', [schedule_id]);
        if (train.rows.length === 0) return res.status(404).json({ error: 'Train not found' });

        // Check no other active session for this train today
        const existingTrain = await pool.query(
            'SELECT id FROM live_train_sessions WHERE schedule_id = $1 AND is_active = true',
            [schedule_id]
        );
        if (existingTrain.rows.length > 0) {
            return res.status(409).json({ error: 'This train is already being tracked by another staff member.' });
        }

        // Check no other active session for this staff
        const existingStaff = await pool.query(
            'SELECT id FROM live_train_sessions WHERE staff_id = $1 AND is_active = true LIMIT 1',
            [req.user.userId]
        );
        if (existingStaff.rows.length > 0) {
            return res.status(409).json({ error: 'You already have an active sharing session.' });
        }

        const result = await pool.query(
            `INSERT INTO live_train_sessions (schedule_id, staff_id, is_active, session_started_at)
             VALUES ($1, $2, true, NOW())
             RETURNING id, schedule_id, session_started_at`,
            [schedule_id, req.user.userId]
        );

        const session = result.rows[0];
        await logAction(req.user.userId, 'GPS_SESSION_STARTED', 'schedule', schedule_id, { sessionId: session.id }, req.ip);
        res.status(201).json({ session });
    } catch (err) { next(err); }
});

// POST /stop — staff stops GPS sharing
router.post('/stop', authenticate, authorize(['staff', 'admin', 'ceylon-track-admin']), async (req, res, next) => {
    try {
        const result = await pool.query(
            'UPDATE live_train_sessions SET is_active = false, session_ended_at = NOW() WHERE staff_id = $1 AND is_active = true',
            [req.user.userId]
        );
        if (result.rowCount > 0) {
            await logAction(req.user.userId, 'GPS_SESSION_STOPPED', 'user', req.user.userId, null, req.ip);
        }
        res.json({ success: true, stopped: result.rowCount });
    } catch (err) { next(err); }
});

// GET /my-active — get current staff's active session
router.get('/my-active', authenticate, authorize(['staff', 'admin', 'ceylon-track-admin']), async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT lts.*, s.train_name, s.train_number
             FROM live_train_sessions lts
             JOIN schedules s ON s.id = lts.schedule_id
             WHERE lts.staff_id = $1 AND lts.is_active = true
             LIMIT 1`,
            [req.user.userId]
        );
        if (result.rows.length === 0) return res.json({ session: null });
        res.json({ session: result.rows[0] });
    } catch (err) { next(err); }
});

// GET /active — get all active sessions (public for live map)
router.get('/active', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT lts.id, lts.schedule_id, s.train_name, s.train_number,
                    lts.last_latitude as lat, lts.last_longitude as lng,
                    lts.last_accuracy as accuracy, lts.last_speed as speed,
                    lts.last_heading as heading, lts.last_updated_at as updated_at,
                    lts.session_started_at,
                    dep.name as from_station, arr.name as to_station
             FROM live_train_sessions lts
             JOIN schedules s ON s.id = lts.schedule_id
             JOIN stations dep ON dep.id = s.from_station_id
             JOIN stations arr ON arr.id = s.to_station_id
             WHERE lts.is_active = true AND lts.last_latitude IS NOT NULL
             ORDER BY lts.last_updated_at DESC NULLS LAST`,
        );
        res.json(result.rows);
    } catch (err) { next(err); }
});

// DELETE /sessions/:id — admin force-cancels a specific GPS session
router.delete('/:id', authenticate, authorize(['ceylon-track-admin', 'admin']), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch the session to get the staff_id before stopping it
        const sessionQuery = await pool.query(
            `SELECT lts.staff_id, lts.schedule_id, s.train_name, s.train_number
             FROM live_train_sessions lts
             JOIN schedules s ON s.id = lts.schedule_id
             WHERE lts.id = $1 AND lts.is_active = true`,
            [id]
        );
        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found or already stopped.' });
        }

        const { staff_id, schedule_id, train_name, train_number } = sessionQuery.rows[0];

        // Stop the session
        await pool.query(
            `UPDATE live_train_sessions
             SET is_active = false, session_ended_at = NOW()
             WHERE id = $1`,
            [id]
        );

        await logAction(req.user.userId, 'GPS_SESSION_FORCE_STOPPED', 'schedule', schedule_id, { sessionId: id, staffId: staff_id }, req.ip);

        // Push real-time notification to the specific staff member
        try {
            const { ws } = require('../index');
            if (ws && typeof ws.broadcastToUser === 'function') {
                ws.broadcastToUser(staff_id, {
                    type: 'session_cancelled_by_admin',
                    trainName: train_name,
                    trainNumber: train_number,
                    message: `Your GPS broadcast for "${train_name || 'Train #' + train_number}" was stopped by an administrator.`
                });
            }
        } catch (e) { /* WebSocket unavailable, ignore */ }

        // Also broadcast train_offline so passenger live map removes the marker
        try {
            const { ws } = require('../index');
            if (ws && typeof ws.broadcastToAll === 'function') {
                ws.broadcastToAll({ type: 'train_offline', trainId: String(schedule_id) });
            }
        } catch (e) {}

        res.json({ success: true, message: 'GPS session cancelled.' });
    } catch (err) { next(err); }
});

module.exports = router;
