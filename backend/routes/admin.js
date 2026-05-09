const express = require('express');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const router = express.Router();

// All routes in this file require authentication and Admin or Staff role.
const adminAuth = [authenticateToken, authorize(['Admin', 'Staff'])];
const adminOnly = [authenticateToken, authorize(['Admin'])];

// ============================================================
// TRIPS — Today's running schedules with live status
// ============================================================

/**
 * GET /api/admin/trips/today
 * Returns all schedules that run today (matched via ScheduleDays) with
 * their latest TripStatusUpdate record (LEFT JOIN so "On Time" shows even
 * when no update record exists yet).
 */
router.get('/trips/today', ...adminAuth, async (req, res) => {
    try {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday … 6 = Saturday
        const todayStr  = today.toISOString().slice(0, 10); // YYYY-MM-DD

        const query = `
            SELECT
                s.id                                        AS schedule_id,
                t.name                                      AS train_name,
                t.number                                    AS train_number,
                r.name                                      AS route_name,
                r.type                                      AS route_type,

                -- departure time = first stop's departure_time
                (
                    SELECT sst_dep.departure_time
                    FROM   ScheduleStationTiming sst_dep
                    WHERE  sst_dep.schedule_id = s.id
                    ORDER  BY sst_dep.stop_sequence ASC
                    LIMIT  1
                )                                           AS departure_time,

                -- arrival time = last stop's arrival_time
                (
                    SELECT sst_arr.arrival_time
                    FROM   ScheduleStationTiming sst_arr
                    WHERE  sst_arr.schedule_id = s.id
                    ORDER  BY sst_arr.stop_sequence DESC
                    LIMIT  1
                )                                           AS arrival_time,

                COALESCE(tsu.status,        'On Time')     AS current_status,
                COALESCE(tsu.delay_minutes, 0)             AS delay_minutes,
                tsu.last_updated,
                tsu.notes
            FROM   Schedule s
            JOIN   Train  t  ON t.id  = s.train_id
            JOIN   Route  r  ON r.id  = s.route_id
            JOIN   ScheduleDays sd ON sd.schedule_id = s.id
                                   AND sd.day_of_week = $1
            LEFT   JOIN TripStatusUpdate tsu
                        ON  tsu.schedule_id = s.id
                        AND tsu.trip_date   = $2
            WHERE  s.active = TRUE
            ORDER  BY departure_time ASC NULLS LAST
        `;

        const result = await pool.query(query, [dayOfWeek, todayStr]);

        res.json({
            date:   todayStr,
            count:  result.rows.length,
            trips:  result.rows.map(row => ({
                schedule_id:    row.schedule_id,
                train:          { name: row.train_name, number: row.train_number },
                route:          { name: row.route_name, type: row.route_type },
                departure_time: row.departure_time ? String(row.departure_time).substring(0, 5) : '--:--',
                arrival_time:   row.arrival_time   ? String(row.arrival_time).substring(0, 5)   : '--:--',
                status:         row.current_status,
                delay_minutes:  parseInt(row.delay_minutes) || 0,
                last_updated:   row.last_updated,
                notes:          row.notes || ''
            }))
        });

    } catch (err) {
        console.error('GET /admin/trips/today error:', err);
        res.status(500).json({ error: 'Failed to fetch today\'s trips', details: err.message });
    }
});

/**
 * PATCH /api/admin/trips/:id/status
 * Updates (or inserts) a TripStatusUpdate record for today.
 * Body: { status, delay_minutes, notes? }
 * Re-uses the same upsert pattern as POST /api/staff/trains/:id/status.
 */
router.patch('/trips/:id/status', ...adminAuth, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id);
        const { status, delay_minutes, notes } = req.body;

        if (!status) return res.status(400).json({ error: 'status is required' });
        const validStatuses = ['On Time', 'Delayed', 'Cancelled', 'Completed', 'Not Started'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
        }

        const delayVal = parseInt(delay_minutes) || 0;
        if (delayVal < 0) return res.status(400).json({ error: 'delay_minutes cannot be negative' });

        const todayStr = new Date().toISOString().slice(0, 10);

        // Upsert using ON CONFLICT
        const upsertQuery = `
            INSERT INTO TripStatusUpdate
                (schedule_id, trip_date, current_station_id, status, delay_minutes, last_updated, notes)
            VALUES ($1, $2, NULL, $3, $4, CURRENT_TIMESTAMP, $5)
            ON CONFLICT (schedule_id, trip_date)
            DO UPDATE SET
                status        = EXCLUDED.status,
                delay_minutes = EXCLUDED.delay_minutes,
                last_updated  = CURRENT_TIMESTAMP,
                notes         = EXCLUDED.notes
            RETURNING *
        `;

        const result = await pool.query(upsertQuery, [
            scheduleId, todayStr, status, delayVal, notes || ''
        ]);

        // Count affected watchers for notification simulation
        const watchersResult = await pool.query(`
            SELECT COUNT(*) AS count FROM JourneyWatch
            WHERE schedule_id = $1
              AND active = TRUE
              AND (watch_date = CURRENT_DATE OR watch_date IS NULL)
        `, [scheduleId]);

        const affectedWatchers = parseInt(watchersResult.rows[0].count);

        res.json({
            success: true,
            update: result.rows[0],
            affected_watchers: affectedWatchers
        });

    } catch (err) {
        console.error('PATCH /admin/trips/:id/status error:', err);
        res.status(500).json({ error: 'Failed to update trip status', details: err.message });
    }
});

// ============================================================
// STATIONS
// ============================================================

/**
 * GET /api/admin/stations
 * Returns all stations. Extracts lat/lng from PostGIS geometry.
 */
router.get('/stations', ...adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                code,
                is_major,
                ROUND(ST_Y(location::geometry)::numeric, 6) AS latitude,
                ROUND(ST_X(location::geometry)::numeric, 6) AS longitude,
                created_at,
                updated_at
            FROM Station
            ORDER BY name ASC
        `);

        res.json({ count: result.rows.length, stations: result.rows });

    } catch (err) {
        console.error('GET /admin/stations error:', err);
        res.status(500).json({ error: 'Failed to fetch stations', details: err.message });
    }
});

/**
 * POST /api/admin/stations
 * Creates a new station.
 * Body: { name, code, latitude, longitude, is_major }
 */
router.post('/stations', ...adminOnly, async (req, res) => {
    try {
        const { name, code, latitude, longitude, is_major } = req.body;

        if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

        const cleanCode = code.toUpperCase().trim();
        if (!/^[A-Z]{2,10}$/.test(cleanCode)) {
            return res.status(400).json({ error: 'Code must be 2–10 uppercase letters' });
        }

        const dupeCheck = await pool.query('SELECT id FROM Station WHERE code = $1', [cleanCode]);
        if (dupeCheck.rows.length > 0) {
            return res.status(409).json({ error: `Station code '${cleanCode}' already exists` });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({ error: 'Invalid latitude or longitude' });
        }

        const result = await pool.query(`
            INSERT INTO Station (name, code, location, is_major)
            VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $5)
            RETURNING
                id, name, code, is_major,
                ROUND(ST_Y(location::geometry)::numeric, 6) AS latitude,
                ROUND(ST_X(location::geometry)::numeric, 6) AS longitude,
                created_at
        `, [name.trim(), cleanCode, lat, lon, is_major === true || is_major === 'true']);

        res.status(201).json({ message: 'Station created', station: result.rows[0] });

    } catch (err) {
        console.error('POST /admin/stations error:', err);
        res.status(500).json({ error: 'Failed to create station', details: err.message });
    }
});

/**
 * PUT /api/admin/stations/:id
 * Updates an existing station's details.
 * Body: { name, code, latitude, longitude, is_major }
 */
router.put('/stations/:id', ...adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, latitude, longitude, is_major } = req.body;

        if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

        const cleanCode = code.toUpperCase().trim();
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'Invalid latitude or longitude' });

        // Check code uniqueness excluding this station
        const dupeCheck = await pool.query(
            'SELECT id FROM Station WHERE code = $1 AND id != $2', [cleanCode, id]
        );
        if (dupeCheck.rows.length > 0) {
            return res.status(409).json({ error: `Station code '${cleanCode}' is already used by another station` });
        }

        const result = await pool.query(`
            UPDATE Station SET
                name     = $1,
                code     = $2,
                location = ST_SetSRID(ST_MakePoint($4, $3), 4326),
                is_major = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING
                id, name, code, is_major,
                ROUND(ST_Y(location::geometry)::numeric, 6) AS latitude,
                ROUND(ST_X(location::geometry)::numeric, 6) AS longitude,
                updated_at
        `, [name.trim(), cleanCode, lat, lon, is_major === true || is_major === 'true', id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Station not found' });
        res.json({ message: 'Station updated', station: result.rows[0] });

    } catch (err) {
        console.error('PUT /admin/stations/:id error:', err);
        res.status(500).json({ error: 'Failed to update station', details: err.message });
    }
});

/**
 * PATCH /api/admin/stations/:id/toggle
 * Toggles the is_major flag (used as the active/inactive indicator).
 */
router.patch('/stations/:id/toggle', ...adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            UPDATE Station SET is_major = NOT is_major, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, name, code, is_major
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Station not found' });
        res.json({ message: 'Station toggled', station: result.rows[0] });

    } catch (err) {
        console.error('PATCH /admin/stations/:id/toggle error:', err);
        res.status(500).json({ error: 'Failed to toggle station', details: err.message });
    }
});

// ============================================================
// SCHEDULES
// ============================================================

/**
 * GET /api/admin/schedules
 * Returns all schedules with train name, route name, origin/destination
 * departure/arrival times, and aggregated operating days array.
 */
router.get('/schedules', ...adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                s.id                    AS schedule_id,
                s.active,
                s.effective_start_date,
                t.id                    AS train_id,
                t.name                  AS train_name,
                t.number                AS train_number,
                r.id                    AS route_id,
                r.name                  AS route_name,
                r.type                  AS route_type,

                -- first stop departure
                (
                    SELECT sst_d.departure_time
                    FROM   ScheduleStationTiming sst_d
                    WHERE  sst_d.schedule_id = s.id
                    ORDER  BY sst_d.stop_sequence ASC
                    LIMIT  1
                )                       AS departure_time,

                -- last stop arrival
                (
                    SELECT sst_a.arrival_time
                    FROM   ScheduleStationTiming sst_a
                    WHERE  sst_a.schedule_id = s.id
                    ORDER  BY sst_a.stop_sequence DESC
                    LIMIT  1
                )                       AS arrival_time,

                -- aggregated days of week as a sorted array
                ARRAY_AGG(sd.day_of_week ORDER BY sd.day_of_week) AS operating_days

            FROM   Schedule s
            JOIN   Train t        ON t.id = s.train_id
            JOIN   Route r        ON r.id = s.route_id
            LEFT   JOIN ScheduleDays sd ON sd.schedule_id = s.id
            GROUP  BY s.id, t.id, t.name, t.number, r.id, r.name, r.type
            ORDER  BY t.name, departure_time ASC NULLS LAST
        `);

        res.json({ count: result.rows.length, schedules: result.rows });

    } catch (err) {
        console.error('GET /admin/schedules error:', err);
        res.status(500).json({ error: 'Failed to fetch schedules', details: err.message });
    }
});

/**
 * POST /api/admin/schedules
 * Creates a new schedule + ScheduleDays records.
 * Body: { train_id, route_id, effective_start_date, days_of_week: number[] }
 */
router.post('/schedules', ...adminOnly, async (req, res) => {
    try {
        const { train_id, route_id, effective_start_date, days_of_week } = req.body;

        if (!train_id || !route_id || !effective_start_date) {
            return res.status(400).json({ error: 'train_id, route_id, and effective_start_date are required' });
        }
        if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
            return res.status(400).json({ error: 'days_of_week must be a non-empty array' });
        }

        const trainCheck = await pool.query('SELECT id FROM Train WHERE id = $1 AND active = TRUE', [train_id]);
        if (trainCheck.rows.length === 0) return res.status(404).json({ error: 'Train not found or inactive' });

        const routeCheck = await pool.query('SELECT id FROM Route WHERE id = $1', [route_id]);
        if (routeCheck.rows.length === 0) return res.status(404).json({ error: 'Route not found' });

        const scheduleResult = await pool.query(`
            INSERT INTO Schedule (train_id, route_id, effective_start_date, active)
            VALUES ($1, $2, $3, TRUE) RETURNING *
        `, [train_id, route_id, effective_start_date]);

        const newId = scheduleResult.rows[0].id;
        const uniqueDays = [...new Set(days_of_week.map(Number))];
        for (const day of uniqueDays) {
            await pool.query(
                'INSERT INTO ScheduleDays (schedule_id, day_of_week) VALUES ($1, $2)',
                [newId, day]
            );
        }

        res.status(201).json({
            message: 'Schedule created',
            schedule: scheduleResult.rows[0],
            days_added: uniqueDays
        });

    } catch (err) {
        console.error('POST /admin/schedules error:', err);
        res.status(500).json({ error: 'Failed to create schedule', details: err.message });
    }
});

/**
 * PUT /api/admin/schedules/:id
 * Updates a schedule's train, route, date, active status, and operating days.
 * Body: { train_id, route_id, effective_start_date, active, days_of_week }
 */
router.put('/schedules/:id', ...adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { train_id, route_id, effective_start_date, active, days_of_week } = req.body;

        const result = await pool.query(`
            UPDATE Schedule SET
                train_id             = COALESCE($1, train_id),
                route_id             = COALESCE($2, route_id),
                effective_start_date = COALESCE($3, effective_start_date),
                active               = COALESCE($4, active)
            WHERE id = $5 RETURNING *
        `, [train_id, route_id, effective_start_date, active, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });

        // Replace operating days if provided
        if (Array.isArray(days_of_week) && days_of_week.length > 0) {
            await pool.query('DELETE FROM ScheduleDays WHERE schedule_id = $1', [id]);
            const uniqueDays = [...new Set(days_of_week.map(Number))];
            for (const day of uniqueDays) {
                await pool.query(
                    'INSERT INTO ScheduleDays (schedule_id, day_of_week) VALUES ($1, $2)',
                    [id, day]
                );
            }
        }

        res.json({ message: 'Schedule updated', schedule: result.rows[0] });

    } catch (err) {
        console.error('PUT /admin/schedules/:id error:', err);
        res.status(500).json({ error: 'Failed to update schedule', details: err.message });
    }
});

/**
 * DELETE /api/admin/schedules/:id
 * Deletes a schedule only if no TripStatusUpdate records reference it.
 */
router.delete('/schedules/:id', ...adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const tripCheck = await pool.query(
            'SELECT COUNT(*) AS count FROM TripStatusUpdate WHERE schedule_id = $1', [id]
        );
        if (parseInt(tripCheck.rows[0].count) > 0) {
            return res.status(409).json({
                error: 'Cannot delete: this schedule has trip records. Deactivate it instead.',
                trip_count: parseInt(tripCheck.rows[0].count)
            });
        }

        const result = await pool.query('DELETE FROM Schedule WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });

        res.json({ message: 'Schedule deleted', id: result.rows[0].id });

    } catch (err) {
        console.error('DELETE /admin/schedules/:id error:', err);
        res.status(500).json({ error: 'Failed to delete schedule', details: err.message });
    }
});

/**
 * GET /api/admin/schedules/:id/stations
 * Returns the full stop-by-stop station timing for a schedule.
 */
router.get('/schedules/:id/stations', ...adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                sst.stop_sequence,
                st.id                   AS station_id,
                st.name                 AS station_name,
                st.code                 AS station_code,
                sst.arrival_time,
                sst.departure_time,
                sst.day_offset,
                sst.stop_duration_minutes
            FROM   ScheduleStationTiming sst
            JOIN   Station st ON st.id = sst.station_id
            WHERE  sst.schedule_id = $1
            ORDER  BY sst.stop_sequence ASC
        `, [id]);

        res.json({ schedule_id: parseInt(id), count: result.rows.length, stations: result.rows });

    } catch (err) {
        console.error('GET /admin/schedules/:id/stations error:', err);
        res.status(500).json({ error: 'Failed to fetch schedule stations', details: err.message });
    }
});

/**
 * GET /api/admin/trains
 * Helper: returns all active trains for dropdowns.
 */
router.get('/trains', ...adminAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, number, type FROM Train WHERE active = TRUE ORDER BY name'
        );
        res.json({ trains: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trains', details: err.message });
    }
});

/**
 * GET /api/admin/routes
 * Helper: returns all routes for dropdowns.
 */
router.get('/routes', ...adminAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, type FROM Route ORDER BY name'
        );
        res.json({ routes: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch routes', details: err.message });
    }
});

/**
 * GET /api/admin/stats
 * Returns dashboard statistics for the admin panel.
 */
router.get('/stats', ...adminAuth, async (req, res) => {
    try {
        const stationsResult = await pool.query(
            'SELECT COUNT(*) FROM Station WHERE is_major = TRUE'
        );
        const trainsResult = await pool.query(
            'SELECT COUNT(*) FROM Train WHERE active = TRUE'
        );
        const tripsResult = await pool.query(
            'SELECT COUNT(*) FROM TripStatusUpdate WHERE trip_date = CURRENT_DATE'
        );

        res.json({
            total_stations: parseInt(stationsResult.rows[0].count),
            active_trains: parseInt(trainsResult.rows[0].count),
            todays_trips: parseInt(tripsResult.rows[0].count)
        });
    } catch (err) {
        console.error('GET /admin/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
    }
});

module.exports = router;
