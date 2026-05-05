const express = require('express');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const router = express.Router();

/**
 * GET /api/watch
 * Returns all active JourneyWatch subscriptions for the logged-in user,
 * enriched with current live trip status for each watched journey.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT
                jw.id           AS watch_id,
                jw.watch_date,
                jw.notify_before_minutes,
                jw.active,
                jw.created_at,
                s.id            AS schedule_id,
                t.name          AS train_name,
                t.number        AS train_number,
                t.type          AS train_type,
                r.name          AS route_name,
                st_from.name    AS from_station,
                st_from.code    AS from_code,
                st_to.name      AS to_station,
                st_to.code      AS to_code,
                sst_from.departure_time,
                sst_to.arrival_time,
                COALESCE(tsu.status, 'Not Started')     AS current_status,
                COALESCE(tsu.delay_minutes, 0)          AS delay_minutes,
                tsu.last_updated                        AS status_updated_at
            FROM JourneyWatch jw
            JOIN Schedule      s        ON jw.schedule_id    = s.id
            JOIN Train         t        ON s.train_id         = t.id
            JOIN Route         r        ON s.route_id         = r.id
            JOIN Station       st_from  ON jw.from_station_id = st_from.id
            JOIN Station       st_to    ON jw.to_station_id   = st_to.id
            JOIN ScheduleStationTiming sst_from
                ON sst_from.schedule_id = s.id AND sst_from.station_id = jw.from_station_id
            JOIN ScheduleStationTiming sst_to
                ON sst_to.schedule_id   = s.id AND sst_to.station_id   = jw.to_station_id
            LEFT JOIN TripStatusUpdate tsu
                ON tsu.schedule_id = s.id
               AND tsu.trip_date   = COALESCE(jw.watch_date, CURRENT_DATE)
            WHERE jw.user_id = $1
              AND jw.active  = TRUE
            ORDER BY jw.watch_date ASC NULLS LAST, sst_from.departure_time ASC
        `;

        const result = await pool.query(query, [req.user.userId]);

        const watches = result.rows.map(row => ({
            watch_id:               row.watch_id,
            watch_date:             row.watch_date,
            notify_before_minutes:  row.notify_before_minutes,
            created_at:             row.created_at,
            schedule: {
                id:          row.schedule_id,
                train_name:  row.train_name,
                train_number: row.train_number,
                train_type:  row.train_type,
                route_name:  row.route_name,
            },
            journey: {
                from_station:    row.from_station,
                from_code:       row.from_code,
                to_station:      row.to_station,
                to_code:         row.to_code,
                departure_time:  row.departure_time ? row.departure_time.substring(0, 5) : null,
                arrival_time:    row.arrival_time   ? row.arrival_time.substring(0, 5)   : null,
            },
            live_status: {
                status:           row.current_status,
                delay_minutes:    parseInt(row.delay_minutes),
                status_updated_at: row.status_updated_at,
            }
        }));

        res.json({ count: watches.length, watches });

    } catch (error) {
        console.error('Watch list error:', error);
        res.status(500).json({ error: 'Failed to fetch watched journeys' });
    }
});

/**
 * POST /api/watch
 * Subscribe the logged-in user to a specific train schedule.
 * Body: { schedule_id, from_station_id, to_station_id, watch_date (optional) }
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { schedule_id, from_station_id, to_station_id, watch_date } = req.body;

        // --- Validation ---
        if (!schedule_id || !from_station_id || !to_station_id) {
            return res.status(400).json({
                error: 'schedule_id, from_station_id, and to_station_id are required'
            });
        }

        // Verify the schedule exists
        const scheduleCheck = await pool.query(
            'SELECT id FROM Schedule WHERE id = $1 AND active = TRUE',
            [schedule_id]
        );
        if (scheduleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Verify both stations exist on this schedule AND from comes before to
        const stationCheck = await pool.query(`
            SELECT station_id, stop_sequence
            FROM ScheduleStationTiming
            WHERE schedule_id = $1 AND station_id IN ($2, $3)
            ORDER BY stop_sequence
        `, [schedule_id, from_station_id, to_station_id]);

        if (stationCheck.rows.length < 2) {
            return res.status(400).json({
                error: 'One or both stations are not on this schedule'
            });
        }

        const [first, second] = stationCheck.rows;
        if (
            parseInt(first.station_id) !== parseInt(from_station_id) ||
            first.stop_sequence >= second.stop_sequence
        ) {
            return res.status(400).json({
                error: 'from_station must come before to_station on this route'
            });
        }

        // Check for duplicate subscription
        const duplicateCheck = await pool.query(`
            SELECT id FROM JourneyWatch
            WHERE user_id = $1
              AND schedule_id = $2
              AND from_station_id = $3
              AND to_station_id   = $4
              AND (watch_date = $5 OR (watch_date IS NULL AND $5::date IS NULL))
              AND active = TRUE
        `, [req.user.userId, schedule_id, from_station_id, to_station_id, watch_date || null]);

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ error: 'You are already watching this journey' });
        }

        // Insert the subscription
        const insertResult = await pool.query(`
            INSERT INTO JourneyWatch
                (user_id, schedule_id, from_station_id, to_station_id, watch_date, notify_before_minutes, active)
            VALUES ($1, $2, $3, $4, $5, 30, TRUE)
            RETURNING *
        `, [req.user.userId, schedule_id, from_station_id, to_station_id, watch_date || null]);

        res.status(201).json({
            message: 'Journey watch created successfully',
            watch: insertResult.rows[0]
        });

    } catch (error) {
        console.error('Watch create error:', error);
        res.status(500).json({ error: 'Failed to create journey watch' });
    }
});

/**
 * DELETE /api/watch/:id
 * Unsubscribe (soft-delete) a specific journey watch.
 * Only the owner can delete their own watch.
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership before deleting
        const ownerCheck = await pool.query(
            'SELECT id, user_id FROM JourneyWatch WHERE id = $1 AND active = TRUE',
            [id]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Watch not found' });
        }

        if (parseInt(ownerCheck.rows[0].user_id) !== req.user.userId) {
            return res.status(403).json({ error: 'You can only remove your own watches' });
        }

        // Soft-delete: set active = false
        await pool.query(
            'UPDATE JourneyWatch SET active = FALSE WHERE id = $1',
            [id]
        );

        res.json({ message: 'Journey watch removed successfully' });

    } catch (error) {
        console.error('Watch delete error:', error);
        res.status(500).json({ error: 'Failed to remove journey watch' });
    }
});

module.exports = router;
