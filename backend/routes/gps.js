const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

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
    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, decoded) => {
        if (!err) {
            req.user = decoded;
        }
        next();
    });
};

// GET /api/gps/all-active
router.get('/all-active', optionalAuthenticate, async (req, res) => {
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
                u.updated_at as "updatedAt"
            FROM trip_status_updates u
            JOIN schedules s ON u.schedule_id = s.id
            JOIN stations sf ON s.from_station_id = sf.id
            JOIN stations st ON s.to_station_id = st.id
            WHERE u.trip_date = CURRENT_DATE 
              AND u.current_lat IS NOT NULL 
              AND u.current_lng IS NOT NULL
            ORDER BY u.updated_at DESC
        `;

        const result = await pool.query(query);

        const trains = result.rows.map(row => ({
            scheduleId: Number(row.scheduleId),
            trainNumber: row.trainNumber,
            trainName: row.trainName,
            fromStation: row.fromStation,
            toStation: row.toStation,
            lat: Number(row.lat),
            lng: Number(row.lng),
            status: row.status,
            updatedAt: row.updatedAt,
            secondsAgo: Math.floor((Date.now() - new Date(row.updatedAt)) / 1000)
        }));

        return res.status(200).json({ trains });
    } catch (error) {
        console.error('Get all active GPS error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/gps/:scheduleId
router.get('/:scheduleId', optionalAuthenticate, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.scheduleId, 10);
        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule ID' });
        }

        const query = `
            SELECT current_lat, current_lng, status, delay_minutes, updated_at
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
            delayMinutes: Number(row.delay_minutes || 0),
            updatedAt: row.updated_at,
            secondsAgo: Math.floor((Date.now() - new Date(row.updated_at)) / 1000)
        });
    } catch (error) {
        console.error('Get GPS by scheduleId error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/gps/mobile-update
router.post('/mobile-update', authenticate, async (req, res) => {
    try {
        const { schedule_id, lat, lng } = req.body;

        const scheduleId = Number(schedule_id);
        const latitude = Number(lat);
        const longitude = Number(lng);

        // Validation bounds:
        // lat must be between 5.0 and 10.0
        // lng must be between 79.0 and 82.5
        // schedule_id must be a positive integer
        if (
            isNaN(latitude) || latitude < 5.0 || latitude > 10.0 ||
            isNaN(longitude) || longitude < 79.0 || longitude > 82.5 ||
            isNaN(scheduleId) || !Number.isInteger(scheduleId) || scheduleId <= 0
        ) {
            return res.status(400).json({ error: 'Invalid coordinates or schedule_id' });
        }

        // UPSERT into trip_status_updates
        const query = `
            INSERT INTO trip_status_updates 
              (schedule_id, trip_date, status, current_lat, current_lng, updated_by, updated_at)
            VALUES 
              ($1, CURRENT_DATE, 'ON_TIME', $2, $3, $4, NOW())
            ON CONFLICT (schedule_id, trip_date) 
            DO UPDATE SET 
              current_lat = EXCLUDED.current_lat,
              current_lng = EXCLUDED.current_lng,
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
        `;

        await pool.query(query, [scheduleId, latitude, longitude, req.user.userId]);

        return res.status(200).json({
            success: true,
            scheduleId,
            lat: latitude,
            lng: longitude,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('POST GPS mobile-update error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Deprecated hardware update endpoint kept for testing compatibility
router.post('/update', async (req, res) => {
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

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({ error: 'Invalid latitude or longitude coordinates' });
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
        console.error('POST GPS hardware update error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
