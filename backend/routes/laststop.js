const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// POST /api/laststop/update
// Station masters can update the last stop of a train passing their station
router.post('/update', authenticate, authorize(['staff', 'admin']), async (req, res) => {
    try {
        const { schedule_id, station_id, station_name } = req.body;
        const scheduleId = parseInt(schedule_id, 10);
        let stationId = parseInt(station_id, 10);
        let stationName = station_name;

        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule_id' });
        }

        // Must be staff or admin
        if (req.user.role !== 'admin' && req.user.role !== 'staff') {
            return res.status(403).json({ error: 'Only staff or admin can update last stops' });
        }

        if (isNaN(stationId)) {
            if (!stationName) {
                return res.status(400).json({ error: 'Either station_id or station_name is required' });
            }
            const stRes = await pool.query('SELECT id, name FROM stations WHERE name = $1 OR code = $1 LIMIT 1', [stationName]);
            if (stRes.rows.length === 0) {
                return res.status(404).json({ error: `Station not found: ${stationName}` });
            }
            stationId = stRes.rows[0].id;
            stationName = stRes.rows[0].name;
        } else {
            const stRes = await pool.query('SELECT name FROM stations WHERE id = $1', [stationId]);
            if (stRes.rows.length === 0) {
                return res.status(404).json({ error: `Station not found for ID: ${stationId}` });
            }
            stationName = stRes.rows[0].name;
        }

        // Insert into train_last_stops
        await pool.query(
            `INSERT INTO train_last_stops (schedule_id, station_id, updated_by, is_manual)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (schedule_id, trip_date)
             DO UPDATE SET station_id = EXCLUDED.station_id, updated_by = EXCLUDED.updated_by, is_manual = true`,
            [scheduleId, stationId, req.user.userId]
        );

        // Update trip_status_updates with the new last stop name and time
        await pool.query(
            `INSERT INTO trip_status_updates (schedule_id, trip_date, status, last_stop_name, last_stop_time, updated_by)
             VALUES ($1, CURRENT_DATE, 'ON_TIME', $2, NOW(), $3)
             ON CONFLICT (schedule_id, trip_date)
             DO UPDATE SET 
               last_stop_name = EXCLUDED.last_stop_name,
               last_stop_time = NOW(),
               updated_by = EXCLUDED.updated_by,
               updated_at = NOW()`,
            [scheduleId, stationName, req.user.userId]
        );

        return res.status(200).json({ message: 'Last stop updated', stationName });
    } catch (error) {
        console.error('Update last stop error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/laststop/:scheduleId
// Fetch the latest manual last stop report for a schedule
router.get('/:scheduleId', async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.scheduleId, 10);
        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule_id' });
        }

        const query = `
            SELECT ls.arrival_time as "arrivalTime", s.name as "stationName", s.name as station_name,
                   ST_Y(s.location::geometry) as lat, 
                   ST_X(s.location::geometry) as lng
            FROM train_last_stops ls
            JOIN stations s ON ls.station_id = s.id
            WHERE ls.schedule_id = $1
            ORDER BY ls.arrival_time DESC
            LIMIT 1
        `;
        const result = await pool.query(query, [scheduleId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No last stop data available' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Get last stop error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
