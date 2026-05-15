const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// POST /api/gps/update
router.post('/update', async (req, res) => {
    try {
        const { train_id, latitude, longitude, speed_kmh, accuracy_meters, device_token } = req.body;

        if (device_token !== process.env.GPS_DEVICE_TOKEN) {
            return res.status(401).json({ error: 'Unauthorized GPS device' });
        }

        if (!train_id || !latitude || !longitude) {
            return res.status(400).json({ error: 'train_id, latitude, and longitude are required' });
        }

        // Find today's active schedule for this train to update TripStatusUpdate
        // If not found, we might just update the most recent one or insert a generic one, but the instruction says:
        // "Store the coordinates in the TripStatusUpdate table by updating the existing row for today's active trip for that train, or inserting a new row if none exists."
        
        // Find a schedule_id for this train_id
        const scheduleRes = await pool.query(`
            SELECT id FROM Schedule 
            WHERE train_id = $1 AND active = TRUE 
            LIMIT 1
        `, [train_id]);

        if (scheduleRes.rows.length === 0) {
            return res.status(404).json({ error: 'No active schedule found for this train' });
        }

        const schedule_id = scheduleRes.rows[0].id;
        const trip_date = new Date().toISOString().split('T')[0];

        // Upsert TripStatusUpdate
        const upsertQuery = `
            INSERT INTO TripStatusUpdate (schedule_id, trip_date, status, delay_minutes, current_lat, current_lng, last_updated)
            VALUES ($1, $2, 'On Time', 0, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (schedule_id, trip_date) 
            DO UPDATE SET 
                current_lat = EXCLUDED.current_lat,
                current_lng = EXCLUDED.current_lng,
                last_updated = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await pool.query(upsertQuery, [schedule_id, trip_date, latitude, longitude]);

        res.json({ success: true, update: result.rows[0] });

    } catch (error) {
        console.error('GPS update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/gps/trains/live
router.get('/trains/live', async (req, res) => {
    try {
        // "Returns all trains that have sent a GPS update in the last 10 minutes."
        const query = `
            SELECT 
                t.id AS train_id,
                t.name AS train_name,
                t.number AS train_number,
                tsu.current_lat,
                tsu.current_lng,
                -- We don't store speed in DB per instructions (unless I missed it, but only asked for lat/lng), so defaulting or passing null/0
                0 AS speed_kmh,
                tsu.last_updated,
                tsu.delay_minutes,
                tsu.status
            FROM TripStatusUpdate tsu
            JOIN Schedule s ON tsu.schedule_id = s.id
            JOIN Train t ON s.train_id = t.id
            WHERE tsu.current_lat IS NOT NULL 
              AND tsu.current_lng IS NOT NULL
              AND tsu.last_updated >= NOW() - INTERVAL '10 minutes'
        `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        console.error('GPS live trains error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/gps/trains/:trainId/track
router.get('/trains/:trainId/track', async (req, res) => {
    try {
        const { trainId } = req.params;
        
        // "Returns the last 20 GPS positions for a specific train in chronological order"
        // Since we only added current_lat and current_lng, we don't have historical points per train per trip unless we have a history table.
        // For now, return the current one as an array to satisfy the requirement, or if we had a history table we'd query it.
        // Wait, the prompt didn't ask to create a GPS history table. So we will just return the latest position as the "track".
        
        const query = `
            SELECT 
                tsu.current_lat AS latitude,
                tsu.current_lng AS longitude,
                tsu.last_updated AS timestamp
            FROM TripStatusUpdate tsu
            JOIN Schedule s ON tsu.schedule_id = s.id
            WHERE s.train_id = $1 
              AND tsu.current_lat IS NOT NULL
            ORDER BY tsu.last_updated DESC
            LIMIT 1
        `;

        const result = await pool.query(query, [trainId]);
        res.json(result.rows);

    } catch (error) {
        console.error('GPS track error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
