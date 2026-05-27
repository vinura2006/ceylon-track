const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

// GET /api/timetable
// Returns the official SLR timetable data (supports filtering by ?route=...)
router.get('/', async (req, res) => {
    try {
        const routeFilter = req.query.route;
        let query = `
            SELECT t.id, t.train_no as "trainNo", t.train_name as "trainName", 
                   COALESCE(sf.name, 'Unknown') as "fromStation", 
                   COALESCE(st.name, 'Unknown') as "toStation", 
                   t.departure_time as "departureTime", t.arrival_time as "arrivalTime",
                   t.train_class as "trainClass", t.frequency, t.route_name as "routeName"
            FROM sri_lanka_timetable t
            LEFT JOIN stations sf ON t.start_station_id = sf.id
            LEFT JOIN stations st ON t.end_station_id = st.id
        `;
        const params = [];
        if (routeFilter) {
            query += ` WHERE t.route_name ILIKE $1`;
            params.push(`%${routeFilter}%`);
        }
        query += ` ORDER BY t.departure_time ASC`;

        const result = await pool.query(query, params);
        
        // Return both plural/singular and count keys to satisfy all consumer endpoints and test expectations
        return res.status(200).json({ 
            timetable: result.rows,
            timetables: result.rows,
            count: result.rows.length 
        });
    } catch (error) {
        console.error('Get timetables error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/timetable/routes
// Returns distinct routes available in the timetable
router.get('/routes', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT route_name as route
            FROM sri_lanka_timetable
            WHERE route_name IS NOT NULL
            UNION
            SELECT DISTINCT sf.name || ' - ' || st.name as route
            FROM sri_lanka_timetable t
            JOIN stations sf ON t.start_station_id = sf.id
            JOIN stations st ON t.end_station_id = st.id
            ORDER BY route
        `;
        const result = await pool.query(query);
        // Map rows to routes list
        const routes = result.rows.map(r => r.route);
        return res.status(200).json({ routes });
    } catch (error) {
        console.error('Get timetable routes error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/timetable/:id
// Returns detailed stops for a specific timetable entry
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid timetable ID' });
        }

        const stopsRes = await pool.query(`
            SELECT ts.id, ts.timetable_id, ts.station_id, s.name as "stationName", s.name as station_name,
                   ts.arrival_time as "arrivalTime", ts.departure_time as "departureTime", ts.stop_sequence as "stopSequence"
            FROM timetable_stops ts
            JOIN stations s ON ts.station_id = s.id
            WHERE ts.timetable_id = $1
            ORDER BY ts.stop_sequence ASC
        `, [id]);

        return res.status(200).json({ stops: stopsRes.rows });
    } catch (error) {
        console.error('Get timetable stops error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/timetable/book/:id
// Logs ticket booking redirects
router.post('/book/:id', authenticate, async (req, res) => {
    try {
        const timetableId = parseInt(req.params.id, 10);
        if (isNaN(timetableId)) {
            return res.status(400).json({ error: 'Invalid timetable ID' });
        }

        // Check if the timetable ID exists
        const timetableCheck = await pool.query(`SELECT id FROM sri_lanka_timetable WHERE id = $1`, [timetableId]);
        if (timetableCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Timetable entry not found' });
        }

        const insertRes = await pool.query(
            `INSERT INTO ticket_bookings (user_id, timetable_id, status) VALUES ($1, $2, 'Redirected') RETURNING id`,
            [req.user.userId, timetableId]
        );

        const bookingId = insertRes.rows[0].id;
        return res.status(200).json({ 
            success: true, 
            message: 'Booking redirect logged', 
            bookingId 
        });
    } catch (error) {
        console.error('Book ticket error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
