const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { logAction } = require('../utils/auditLogger');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authenticate);
router.use(authorize(['admin', 'ceylon-track-admin']));

// GET /api/admin/analytics
router.get('/analytics', async (req, res, next) => {
    try {
        const usersRes = await pool.query("SELECT COUNT(*) FROM users");
        const passengersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'passenger'");
        const activeStaffRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'staff' AND status = 'active'");
        
        const activeSchedulesRes = await pool.query("SELECT COUNT(*) FROM schedules WHERE is_active = true");
        const gpsRes = await pool.query("SELECT COUNT(*) FROM train_assignments WHERE is_active = true");
        const watchesRes = await pool.query("SELECT COUNT(*) FROM journey_watches");

        res.json({
            totalUsers: parseInt(usersRes.rows[0].count, 10),
            totalPassengers: parseInt(passengersRes.rows[0].count, 10),
            activeStaff: parseInt(activeStaffRes.rows[0].count, 10),
            activeSchedules: parseInt(activeSchedulesRes.rows[0].count, 10),
            gpsActive: parseInt(gpsRes.rows[0].count, 10),
            totalWatches: parseInt(watchesRes.rows[0].count, 10)
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/admin/schedules
router.get('/schedules', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT s.id, s.train_number, s.train_name, 
                   sf.name as from_station, st.name as to_station, 
                   s.departure_time, s.arrival_time, s.class, s.is_active
            FROM schedules s
            JOIN stations sf ON s.from_station_id = sf.id
            JOIN stations st ON s.to_station_id = st.id
            ORDER BY s.id DESC
        `);
        res.json({ schedules: result.rows });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/admin/schedules/:id
router.delete('/schedules/:id', async (req, res, next) => {
    try {
        const scheduleId = parseInt(req.params.id, 10);
        await pool.query('DELETE FROM schedules WHERE id = $1', [scheduleId]);
        await logAction(req.user.userId, 'SCHEDULE_DELETED', 'schedule', scheduleId, null, req.ip);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/admin/stations/:id
router.delete('/stations/:id', async (req, res, next) => {
    try {
        const stationId = parseInt(req.params.id, 10);
        await pool.query('DELETE FROM stations WHERE id = $1', [stationId]);
        await logAction(req.user.userId, 'STATION_DELETED', 'station', stationId, null, req.ip);
        res.json({ success: true });
    } catch (err) {
        // Can fail if schedules still reference this station (foreign key constraint)
        next(err);
    }
});

module.exports = router;
