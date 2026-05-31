const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { logAction } = require('../utils/auditLogger');
const { updateTrainStatusValidation, createStationValidation, createScheduleValidation } = require('../middleware/validate');

// GET /stats
router.get('/stats', authenticate, authorize(['staff', 'admin', 'ceylon-track-admin']), async (req, res, next) => {
    try {
        const activeSchedulesRes = await pool.query("SELECT COUNT(*) FROM schedules WHERE is_active = true");
        const delayedRes = await pool.query("SELECT COUNT(*) FROM trip_status_updates WHERE status = 'DELAYED' AND trip_date = CURRENT_DATE");
        const cancelledRes = await pool.query("SELECT COUNT(*) FROM trip_status_updates WHERE status = 'CANCELLED' AND trip_date = CURRENT_DATE");
        const watchersRes = await pool.query("SELECT COUNT(DISTINCT user_id) FROM journey_watches");

        return res.status(200).json({
            activeSchedules: parseInt(activeSchedulesRes.rows[0].count, 10),
            delayedTrains: parseInt(delayedRes.rows[0].count, 10),
            cancelledTrains: parseInt(cancelledRes.rows[0].count, 10),
            activeWatchers: parseInt(watchersRes.rows[0].count, 10)
        });
    } catch (error) {
        next(error);
    }
});

// POST /trains/:id/status
router.post('/trains/:id/status', authenticate, authorize(['staff', 'admin', 'ceylon-track-admin']), updateTrainStatusValidation, async (req, res, next) => {
    try {
        const scheduleId = parseInt(req.params.id, 10);
        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule ID' });
        }

        const user = req.user;
        const { status, delay_minutes = 0, notes = '', current_station } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        const allowedStatuses = ['ON_TIME', 'DELAYED', 'CANCELLED'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        if (delay_minutes < 0) {
            return res.status(400).json({ error: 'delay_minutes cannot be negative' });
        }

        // Station master restriction: must update trains at their station only
        if (user.sub_role === 'station_master') {
            if (!user.home_station_id) {
                return res.status(403).json({ error: 'You must set your home station first' });
            }
            const stopCheck = await pool.query(
                `SELECT 1 FROM stop_times st
                 WHERE st.schedule_id = $1 AND st.station_id = $2
                 LIMIT 1`,
                [scheduleId, user.home_station_id]
            );
            if (stopCheck.rowCount === 0) {
                return res.status(403).json({ error: 'This train does not stop at your station' });
            }
        }

        const finalDelay = (status === 'ON_TIME' || status === 'CANCELLED') ? 0 : delay_minutes;

        // Check if schedule exists
        const schedCheck = await pool.query('SELECT id FROM schedules WHERE id = $1', [scheduleId]);
        if (schedCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Upsert status
        await pool.query(
            `INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, notes, last_stop_name, updated_by)
             VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
             ON CONFLICT (schedule_id, trip_date)
             DO UPDATE SET status = EXCLUDED.status, delay_minutes = EXCLUDED.delay_minutes, notes = EXCLUDED.notes, last_stop_name = COALESCE(EXCLUDED.last_stop_name, trip_status_updates.last_stop_name), updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
            [scheduleId, status, finalDelay, notes, current_station || null, user.userId]
        );

        // Count affected watchers
        const watchersCountRes = await pool.query(
            'SELECT COUNT(DISTINCT user_id) FROM journey_watches WHERE schedule_id = $1',
            [scheduleId]
        );

        await logAction(user.userId, 'UPDATE_TRAIN_STATUS', 'schedule', scheduleId,
            { status, delay_minutes: finalDelay, current_station }, req.ip);

        return res.status(200).json({
            message: 'Status updated',
            updatedCount: parseInt(watchersCountRes.rows[0].count, 10)
        });
    } catch (error) {
        next(error);
    }
});

// POST /set-station — Station master sets home station
router.post('/set-station', authenticate, authorize(['staff']), async (req, res, next) => {
    try {
        const { stationId } = req.body;
        if (!stationId) return res.status(400).json({ error: 'stationId required' });
        if (req.user.sub_role !== 'station_master') {
            return res.status(403).json({ error: 'Only station masters can set a home station' });
        }
        await pool.query(
            'UPDATE users SET home_station_id = $1 WHERE id = $2',
            [stationId, req.user.userId]
        );
        await logAction(req.user.userId, 'SET_HOME_STATION', 'station', stationId, null, req.ip);
        res.json({ success: true });
    } catch (err) { next(err); }
});

// POST /stations (admin only)
router.post('/stations', authenticate, authorize(['ceylon-track-admin', 'admin']), createStationValidation, async (req, res, next) => {
    try {
        const { name, code, lat, lng } = req.body;

        if (!name || !code || lat === undefined || lng === undefined) {
            return res.status(400).json({ error: 'name, code, lat, and lng are required' });
        }

        const result = await pool.query(
            `INSERT INTO stations (name, code, location) 
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography) 
             RETURNING id, name, code, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng, created_at as "createdAt"`,
            [name, code, lat, lng]
        );

        await logAction(req.user.userId, 'CREATE_STATION', 'station', result.rows[0].id, { name, code }, req.ip);

        return res.status(201).json({ station: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// POST /schedules (admin only)
router.post('/schedules', authenticate, authorize(['ceylon-track-admin', 'admin']), createScheduleValidation, async (req, res, next) => {
    try {
        const { train_number, train_name = '', from_station_id, to_station_id, departure_time, arrival_time, class: trainClass } = req.body;

        if (!train_number || !from_station_id || !to_station_id || !departure_time || !arrival_time || !trainClass) {
            return res.status(400).json({ error: 'All schedule fields are required' });
        }

        const result = await pool.query(
            `INSERT INTO schedules (train_number, train_name, from_station_id, to_station_id, departure_time, arrival_time, class)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, train_number as "trainNumber", train_name as "trainName", from_station_id as "fromStationId", to_station_id as "toStationId", departure_time as "departureTime", arrival_time as "arrivalTime", class`,
            [train_number, train_name, from_station_id, to_station_id, departure_time, arrival_time, trainClass]
        );

        await logAction(req.user.userId, 'CREATE_SCHEDULE', 'schedule', result.rows[0].id, { train_number }, req.ip);

        return res.status(201).json({ schedule: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
