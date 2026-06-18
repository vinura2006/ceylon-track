const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { logAction } = require('../utils/auditLogger');

// WebSocket broadcast — lazily loaded to avoid circular require at startup
function broadcastTrainUpdate(data) {
    try {
        const { ws } = require('../index');
        if (ws && typeof ws.broadcastToAll === 'function') {
            ws.broadcastToAll(data);
        }
    } catch (e) { /* ignore if not available */ }
}

// Optional authentication middleware for GET endpoints
// Allows public access to the live map while registering user if token present
const optionalAuthenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return next();
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return next();
    }
    const token = parts[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) {
            req.user = decoded;
        }
        next();
    });
};

// GET /api/gps/all-active
router.get('/all-active', optionalAuthenticate, async (req, res, next) => {
    try {
        const query = `
            SELECT 
                s.id as "scheduleId",
                s.train_number as "trainNumber",
                s.train_name as "trainName",
                sf.name as "fromStation",
                st.name as "toStation",
                u.current_lat as "lat",
                u.current_lng as "lng",
                u.status,
                u.delay_minutes as "delayMinutes",
                u.last_stop_name as "lastStopName",
                u.last_stop_time as "lastStopTime",
                u.updated_at as "updatedAt"
            FROM trip_status_updates u
            JOIN schedules s ON u.schedule_id = s.id
            JOIN stations sf ON s.from_station_id = sf.id
            JOIN stations st ON s.to_station_id = st.id
            WHERE u.trip_date = CURRENT_DATE 
              AND u.current_lat IS NOT NULL 
              AND u.current_lng IS NOT NULL
              AND u.updated_at > NOW() - INTERVAL '15 minutes'
            ORDER BY u.updated_at DESC
        `;

        let result = await pool.query(query);

        // Fallback: If no live GPS records exist for today, fall back to the most recent date with coordinates
        if (result.rows.length === 0) {
            const dateRes = await pool.query(
                `SELECT MAX(trip_date) as max_date 
                 FROM trip_status_updates 
                 WHERE current_lat IS NOT NULL AND current_lng IS NOT NULL`
            );
            if (dateRes.rows.length > 0 && dateRes.rows[0].max_date) {
                const maxDate = dateRes.rows[0].max_date;
                const fallbackQuery = `
                    SELECT 
                        s.id as "scheduleId",
                        s.train_number as "trainNumber",
                        s.train_name as "trainName",
                        sf.name as "fromStation",
                        st.name as "toStation",
                        u.current_lat as "lat",
                        u.current_lng as "lng",
                        u.status,
                        u.delay_minutes as "delayMinutes",
                        u.last_stop_name as "lastStopName",
                        u.last_stop_time as "lastStopTime",
                        u.updated_at as "updatedAt"
                    FROM trip_status_updates u
                    JOIN schedules s ON u.schedule_id = s.id
                    JOIN stations sf ON s.from_station_id = sf.id
                    JOIN stations st ON s.to_station_id = st.id
                    WHERE u.trip_date = $1
                      AND u.current_lat IS NOT NULL 
                      AND u.current_lng IS NOT NULL
                    ORDER BY u.updated_at DESC
                `;
                result = await pool.query(fallbackQuery, [maxDate]);
            }
        }

        const trains = result.rows.map(row => ({
            schedule_id: Number(row.scheduleId),
            scheduleId: Number(row.scheduleId),
            trainNumber: row.trainNumber,
            trainName: row.trainName,
            fromStation: row.fromStation,
            toStation: row.toStation,
            lat: Number(row.lat),
            lng: Number(row.lng),
            status: row.status,
            delayMinutes: Number(row.delayMinutes || 0),
            lastStopName: row.lastStopName,
            lastStopTime: row.lastStopTime,
            updatedAt: row.updatedAt,
            secondsAgo: Math.floor((Date.now() - new Date(row.updatedAt)) / 1000)
        }));

        return res.status(200).json({ trains });
    } catch (error) {
        next(error);
    }
});

// GET /api/gps/:scheduleId
router.get('/:scheduleId', optionalAuthenticate, async (req, res, next) => {
    try {
        const scheduleId = parseInt(req.params.scheduleId, 10);
        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule ID' });
        }

        const query = `
            SELECT current_lat, current_lng, status, delay_minutes, last_stop_name, last_stop_time, updated_at
            FROM trip_status_updates
            WHERE schedule_id = $1 AND trip_date = CURRENT_DATE
            ORDER BY updated_at DESC
            LIMIT 1
        `;

        const result = await pool.query(query, [scheduleId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No live GPS data for this train today' });
        }

        const row = result.rows[0];
        if (row.current_lat === null || row.current_lng === null) {
            return res.status(404).json({ error: 'Train location not available yet' });
        }

        return res.status(200).json({
            scheduleId,
            lat: Number(row.current_lat),
            lng: Number(row.current_lng),
            status: row.status,
            lastStopName: row.last_stop_name,
            lastStopTime: row.last_stop_time,
            delayMinutes: Number(row.delay_minutes || 0),
            updatedAt: row.updated_at,
            secondsAgo: Math.floor((Date.now() - new Date(row.updated_at)) / 1000)
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/gps/mobile-update
router.post('/mobile-update', authenticate, authorize(['staff', 'admin']), async (req, res, next) => {
    try {
        const user = req.user;

        if (user.sub_role === 'station_master') {
            return res.status(403).json({ error: 'Station masters cannot broadcast GPS location' });
        }

        const { schedule_id, lat, lng, accuracy, heading, speed } = req.body;

        const scheduleId = Number(schedule_id);
        const latitude = Number(lat);
        const longitude = Number(lng);

        // Validate coordinates are within Sri Lanka bounds (tightened)
        if (isNaN(latitude) || latitude < 5.7 || latitude > 9.9 ||
            isNaN(longitude) || longitude < 79.5 || longitude > 81.9 ||
            isNaN(scheduleId) || !Number.isInteger(scheduleId) || scheduleId <= 0) {
            return res.status(400).json({ error: 'Invalid coordinates or schedule_id' });
        }

        // Enforce assignment OR session check
        const assignmentCheck = await pool.query(
            'SELECT id FROM train_assignments WHERE schedule_id = $1 AND user_id = $2 AND is_active = true',
            [scheduleId, user.userId]
        );
        const sessionCheck = await pool.query(
            'SELECT id FROM live_train_sessions WHERE schedule_id = $1 AND staff_id = $2 AND is_active = true',
            [scheduleId, user.userId]
        );
        if (assignmentCheck.rows.length === 0 && sessionCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No active assignment or session found. Start your session first.' });
        }

        // UPSERT into trip_status_updates
        await pool.query(
            `INSERT INTO trip_status_updates
               (schedule_id, trip_date, status, current_lat, current_lng, gps_source, updated_by, updated_at)
             VALUES ($1, CURRENT_DATE, 'ON_TIME', $2, $3, 'mobile', $4, NOW())
             ON CONFLICT (schedule_id, trip_date)
             DO UPDATE SET
               current_lat = EXCLUDED.current_lat,
               current_lng = EXCLUDED.current_lng,
               gps_source = 'mobile',
               updated_by = EXCLUDED.updated_by,
               updated_at = NOW()`,
            [scheduleId, latitude, longitude, user.userId]
        );

        // ALSO update live_train_sessions so the live map (/api/sessions/active) can see this train
        await pool.query(
            `UPDATE live_train_sessions
             SET last_latitude = $1, last_longitude = $2, last_accuracy = $3,
                 last_speed = $4, last_heading = $5, last_updated_at = NOW()
             WHERE schedule_id = $6 AND staff_id = $7 AND is_active = true`,
            [latitude, longitude, accuracy || null, speed || null, heading || null, scheduleId, user.userId]
        );

        // Get train info for WebSocket broadcast
        const trainInfo = await pool.query(
            `SELECT s.train_name, s.train_number FROM schedules s WHERE s.id = $1`,
            [scheduleId]
        );
        const trainRow = trainInfo.rows[0] || {};

        // Broadcast real-time update to all connected WebSocket clients (passengers on live map)
        broadcastTrainUpdate({
            type: 'train_update',
            trainId: String(scheduleId),
            trainName: trainRow.train_name || '',
            trainNumber: trainRow.train_number || '',
            latitude,
            longitude,
            accuracy: accuracy || null,
            speed: speed || null,
            heading: heading || null,
            timestamp: new Date().toISOString()
        });

        // Log action in audit logs
        await logAction(user.userId, 'GPS_UPDATE', 'schedule', scheduleId, { lat: latitude, lng: longitude, speed, heading }, req.ip);

        return res.status(200).json({
            success: true,
            scheduleId,
            lat: latitude,
            lng: longitude,
            timestamp: new Date()
        });
    } catch (error) {
        next(error);
    }
});

// Deprecated hardware update endpoint kept for testing compatibility
router.post('/update', async (req, res, next) => {
    try {
        const gpsToken = req.headers['x-gps-token'];
        if (!gpsToken || gpsToken !== process.env.GPS_DEVICE_TOKEN) {
            return res.status(401).json({ error: 'Unauthorized GPS token' });
        }

        const { schedule_id, lat, lng, status = 'ON_TIME', delay_minutes = 0 } = req.body;

        if (!schedule_id || lat === undefined || lng === undefined) {
            return res.status(400).json({ error: 'schedule_id, lat, and lng are required' });
        }

        const latitude = Number(lat);
        const longitude = Number(lng);

        if (latitude < 5.7 || latitude > 9.9 || longitude < 79.5 || longitude > 81.9) {
            return res.status(400).json({ error: 'Coordinates outside Sri Lanka bounds' });
        }

        // Upsert GPS
        await pool.query(
            `INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, current_lat, current_lng)
             VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
             ON CONFLICT (schedule_id, trip_date)
             DO UPDATE SET current_lat = EXCLUDED.current_lat, current_lng = EXCLUDED.current_lng, updated_at = NOW()`,
            [schedule_id, status, delay_minutes, latitude, longitude]
        );

        return res.status(200).json({
            message: 'GPS updated',
            scheduleId: Number(schedule_id),
            lat: latitude,
            lng: longitude
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
