const express = require('express');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const router = express.Router();

// ============================================================
// EXISTING: POST /api/staff/trains/:id/status
// Update or create today's TripStatusUpdate for a schedule.
// Now also returns affected_watchers count.
// ============================================================
router.post('/trains/:id/status', authenticateToken, authorize(['Staff', 'Admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { delay_minutes, status, notes } = req.body;

        if (delay_minutes === undefined || delay_minutes === null) {
            return res.status(400).json({ error: 'delay_minutes is required' });
        }

        const delayValue = parseInt(delay_minutes);
        if (isNaN(delayValue) || delayValue < 0) {
            return res.status(400).json({ error: 'delay_minutes must be a non-negative integer' });
        }

        const checkQuery = `
            SELECT id FROM TripStatusUpdate
            WHERE schedule_id = $1 AND trip_date = CURRENT_DATE
        `;
        const checkResult = await pool.query(checkQuery, [id]);

        let result;
        const statusValue = status || 'Delayed';
        const notesValue  = notes  || '';

        if (checkResult.rows.length > 0) {
            const updateQuery = `
                UPDATE TripStatusUpdate
                SET status        = $1,
                    delay_minutes = $2,
                    last_updated  = CURRENT_TIMESTAMP,
                    notes         = $3
                WHERE schedule_id = $4 AND trip_date = CURRENT_DATE
                RETURNING *
            `;
            result = await pool.query(updateQuery, [statusValue, delayValue, notesValue, id]);
        } else {
            const insertQuery = `
                INSERT INTO TripStatusUpdate
                    (schedule_id, trip_date, current_station_id, status, delay_minutes, last_updated, notes)
                VALUES ($1, CURRENT_DATE, 1, $2, $3, CURRENT_TIMESTAMP, $4)
                RETURNING *
            `;
            result = await pool.query(insertQuery, [id, statusValue, delayValue, notesValue]);
        }

        // Count how many users are watching this schedule today (notification simulation)
        const watchersResult = await pool.query(`
            SELECT COUNT(*) AS count
            FROM JourneyWatch
            WHERE schedule_id = $1
              AND active = TRUE
              AND (watch_date = CURRENT_DATE OR watch_date IS NULL)
        `, [id]);
        const affectedWatchers = parseInt(watchersResult.rows[0].count);

        res.json({
            success: true,
            message: 'Train status updated successfully',
            update: result.rows[0],
            affected_watchers: affectedWatchers,
            notification_note: affectedWatchers > 0
                ? `${affectedWatchers} passenger(s) watching this train would be notified.`
                : 'No active watchers for this train today.'
        });

    } catch (error) {
        console.error('Staff status update error:', error);
        res.status(500).json({ error: 'Internal server error while updating train status' });
    }
});

// ============================================================
// NEW: GET /api/staff/stats
// Returns live dashboard statistics for the admin panel.
// ============================================================
router.get('/stats', authenticateToken, authorize(['Staff', 'Admin']), async (req, res) => {
    try {
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM Schedule WHERE active = TRUE)
                    AS total_active_schedules,

                (SELECT COUNT(*) FROM TripStatusUpdate WHERE trip_date = CURRENT_DATE AND status = 'Delayed')
                    AS delayed_today,

                (SELECT COUNT(*) FROM TripStatusUpdate WHERE trip_date = CURRENT_DATE AND status = 'Cancelled')
                    AS cancelled_today,

                (SELECT COUNT(*) FROM TripStatusUpdate WHERE trip_date = CURRENT_DATE AND status = 'On Time')
                    AS on_time_today,

                (SELECT COUNT(*) FROM TripStatusUpdate WHERE trip_date = CURRENT_DATE)
                    AS total_trips_with_updates,

                (SELECT COUNT(*) FROM Station)
                    AS total_stations,

                (SELECT COUNT(*) FROM Train WHERE active = TRUE)
                    AS total_active_trains,

                (SELECT COUNT(*) FROM "User" WHERE active = TRUE)
                    AS total_users,

                (SELECT COUNT(*) FROM JourneyWatch WHERE active = TRUE AND (watch_date = CURRENT_DATE OR watch_date IS NULL))
                    AS active_watchers_today
        `;

        const result = await pool.query(statsQuery);
        const row = result.rows[0];

        const totalWithUpdates = parseInt(row.total_trips_with_updates) || 0;
        const onTimeCount      = parseInt(row.on_time_today) || 0;
        const onTimePct = totalWithUpdates > 0
            ? Math.round((onTimeCount / totalWithUpdates) * 100)
            : null; // null = no data yet today

        res.json({
            total_active_schedules: parseInt(row.total_active_schedules),
            total_active_trains:    parseInt(row.total_active_trains),
            total_stations:         parseInt(row.total_stations),
            total_users:            parseInt(row.total_users),
            today: {
                delayed:              parseInt(row.delayed_today),
                cancelled:            parseInt(row.cancelled_today),
                on_time:              onTimeCount,
                trips_with_updates:   totalWithUpdates,
                on_time_percent:      onTimePct,
                active_watchers:      parseInt(row.active_watchers_today),
            },
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// ============================================================
// NEW: POST /api/staff/stations
// Add a new station. Admin-only.
// Body: { name, code, latitude, longitude, is_major }
// ============================================================
router.post('/stations', authenticateToken, authorize(['Admin']), async (req, res) => {
    try {
        const { name, code, latitude, longitude, is_major } = req.body;

        if (!name || !code) {
            return res.status(400).json({ error: 'name and code are required' });
        }

        const cleanCode = code.toUpperCase().trim();
        if (!/^[A-Z]{2,10}$/.test(cleanCode)) {
            return res.status(400).json({ error: 'Station code must be 2–10 uppercase letters' });
        }

        // Check for duplicate code
        const dupeCheck = await pool.query('SELECT id FROM Station WHERE code = $1', [cleanCode]);
        if (dupeCheck.rows.length > 0) {
            return res.status(409).json({ error: `Station code '${cleanCode}' already exists` });
        }

        let locationParam = null;
        if (latitude !== undefined && longitude !== undefined) {
            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);
            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                return res.status(400).json({ error: 'Invalid latitude or longitude values' });
            }
            locationParam = `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`;
        }

        const insertQuery = locationParam
            ? `INSERT INTO Station (name, code, location, is_major)
               VALUES ($1, $2, ${locationParam}, $3)
               RETURNING id, name, code, is_major, created_at`
            : `INSERT INTO Station (name, code, is_major)
               VALUES ($1, $2, $3)
               RETURNING id, name, code, is_major, created_at`;

        const result = await pool.query(insertQuery, [
            name.trim(),
            cleanCode,
            is_major === true || is_major === 'true'
        ]);

        res.status(201).json({
            message: 'Station added successfully',
            station: result.rows[0]
        });

    } catch (error) {
        console.error('Add station error:', error);
        res.status(500).json({ error: 'Failed to add station' });
    }
});

// ============================================================
// NEW: POST /api/staff/schedules
// Add a new schedule (links train to route on given days). Admin-only.
// Body: { train_id, route_id, effective_start_date, days_of_week: [0-6] }
// ============================================================
router.post('/schedules', authenticateToken, authorize(['Admin']), async (req, res) => {
    try {
        const { train_id, route_id, effective_start_date, days_of_week } = req.body;

        if (!train_id || !route_id || !effective_start_date) {
            return res.status(400).json({
                error: 'train_id, route_id, and effective_start_date are required'
            });
        }

        if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
            return res.status(400).json({
                error: 'days_of_week must be a non-empty array of integers 0–6'
            });
        }

        const validDays = days_of_week.every(d => Number.isInteger(d) && d >= 0 && d <= 6);
        if (!validDays) {
            return res.status(400).json({ error: 'Each day_of_week must be an integer between 0 and 6' });
        }

        // Verify train exists
        const trainCheck = await pool.query('SELECT id FROM Train WHERE id = $1 AND active = TRUE', [train_id]);
        if (trainCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Train not found or inactive' });
        }

        // Verify route exists
        const routeCheck = await pool.query('SELECT id FROM Route WHERE id = $1', [route_id]);
        if (routeCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(effective_start_date)) {
            return res.status(400).json({ error: 'effective_start_date must be in YYYY-MM-DD format' });
        }

        // Insert Schedule
        const scheduleResult = await pool.query(`
            INSERT INTO Schedule (train_id, route_id, effective_start_date, active)
            VALUES ($1, $2, $3, TRUE)
            RETURNING *
        `, [train_id, route_id, effective_start_date]);

        const newScheduleId = scheduleResult.rows[0].id;

        // Insert ScheduleDays rows
        const uniqueDays = [...new Set(days_of_week)];
        for (const day of uniqueDays) {
            await pool.query(
                'INSERT INTO ScheduleDays (schedule_id, day_of_week) VALUES ($1, $2)',
                [newScheduleId, day]
            );
        }

        res.status(201).json({
            message: 'Schedule created successfully',
            schedule: scheduleResult.rows[0],
            days_added: uniqueDays,
            note: 'Station timings must be added separately via direct DB insert for now.'
        });

    } catch (error) {
        console.error('Add schedule error:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});

module.exports = router;
