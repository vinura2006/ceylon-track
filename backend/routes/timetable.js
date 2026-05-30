const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

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

// GET /api/timetable/grouped
// Returns all timetable records grouped by route_name
router.get('/grouped', async (req, res) => {
    try {
        const query = `
            SELECT t.id, t.train_no as "trainNo", t.train_name as "trainName", 
                   COALESCE(sf.name, 'Unknown') as "fromStation", 
                   COALESCE(st.name, 'Unknown') as "toStation", 
                   t.departure_time as "departureTime", t.arrival_time as "arrivalTime",
                   t.train_class as "trainClass", t.frequency, t.route_name as "routeName"
            FROM sri_lanka_timetable t
            LEFT JOIN stations sf ON t.start_station_id = sf.id
            LEFT JOIN stations st ON t.end_station_id = st.id
            ORDER BY t.route_name ASC, t.departure_time ASC
        `;
        const result = await pool.query(query);
        const grouped = {};
        result.rows.forEach(row => {
            const route = row.routeName || 'Other';
            if (!grouped[route]) {
                grouped[route] = [];
            }
            grouped[route].push(row);
        });
        return res.status(200).json({ groupedTimetables: grouped });
    } catch (error) {
        console.error('Get grouped timetables error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/timetable/change-requests
// Admin fetches all change requests
router.get('/change-requests', authenticate, authorize(['admin', 'ceylon-track-admin']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT cr.*, 
                   u.first_name || ' ' || u.last_name as "staffName",
                   t.train_no as "currentTrainNo", t.train_name as "currentTrainName",
                   sf.name as "proposedStartStation", st.name as "proposedEndStation"
            FROM timetable_change_requests cr
            JOIN users u ON cr.requested_by = u.id
            LEFT JOIN sri_lanka_timetable t ON cr.timetable_id = t.id
            LEFT JOIN stations sf ON cr.proposed_start_station_id = sf.id
            LEFT JOIN stations st ON cr.proposed_end_station_id = st.id
            ORDER BY cr.created_at DESC
        `);
        return res.status(200).json({ requests: result.rows });
    } catch (error) {
        console.error('Get change requests error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/timetable/my-change-requests
// Staff fetches their own change requests
router.get('/my-change-requests', authenticate, authorize(['staff', 'admin', 'ceylon-track-admin']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT cr.*, 
                   t.train_no as "currentTrainNo", t.train_name as "currentTrainName"
            FROM timetable_change_requests cr
            LEFT JOIN sri_lanka_timetable t ON cr.timetable_id = t.id
            WHERE cr.requested_by = $1
            ORDER BY cr.created_at DESC
        `, [req.user.userId]);
        return res.status(200).json({ requests: result.rows });
    } catch (error) {
        console.error('Get my change requests error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/timetable/change-request
// Staff proposes a change
router.post('/change-request', authenticate, authorize(['staff', 'admin', 'ceylon-track-admin']), async (req, res) => {
    try {
        const {
            timetable_id, change_type, proposed_train_no, proposed_train_name,
            proposed_route_name, proposed_start_station_id, proposed_end_station_id,
            proposed_departure_time, proposed_arrival_time, proposed_train_class,
            proposed_frequency, reason
        } = req.body;

        if (!change_type || !['edit', 'add', 'delete'].includes(change_type)) {
            return res.status(400).json({ error: 'Invalid change type' });
        }

        if (change_type !== 'add' && !timetable_id) {
            return res.status(400).json({ error: 'Timetable ID is required' });
        }

        await pool.query(`
            INSERT INTO timetable_change_requests 
                (timetable_id, requested_by, change_type, proposed_train_no, proposed_train_name,
                 proposed_route_name, proposed_start_station_id, proposed_end_station_id,
                 proposed_departure_time, proposed_arrival_time, proposed_train_class,
                 proposed_frequency, reason)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            timetable_id || null, req.user.userId, change_type, proposed_train_no || null,
            proposed_train_name || null, proposed_route_name || null, proposed_start_station_id || null,
            proposed_end_station_id || null, proposed_departure_time || null, proposed_arrival_time || null,
            proposed_train_class || null, proposed_frequency || null, reason || ''
        ]);

        return res.status(201).json({ success: true, message: 'Change request submitted for admin approval' });
    } catch (error) {
        console.error('Create change request error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/timetable/change-requests/:id
// Admin approves/rejects change request
router.put('/change-requests/:id', authenticate, authorize(['admin', 'ceylon-track-admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status, review_note } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }

        const requestRes = await pool.query('SELECT * FROM timetable_change_requests WHERE id = $1', [id]);
        if (requestRes.rows.length === 0) {
            return res.status(404).json({ error: 'Change request not found' });
        }

        const cr = requestRes.rows[0];
        if (cr.status !== 'pending') {
            return res.status(400).json({ error: 'Change request already reviewed' });
        }

        if (status === 'approved') {
            if (cr.change_type === 'edit') {
                const fields = [];
                const params = [];
                let paramIndex = 1;

                if (cr.proposed_train_no) { fields.push(`train_no = $${paramIndex++}`); params.push(cr.proposed_train_no); }
                if (cr.proposed_train_name) { fields.push(`train_name = $${paramIndex++}`); params.push(cr.proposed_train_name); }
                if (cr.proposed_route_name) { fields.push(`route_name = $${paramIndex++}`); params.push(cr.proposed_route_name); }
                if (cr.proposed_start_station_id) { fields.push(`start_station_id = $${paramIndex++}`); params.push(cr.proposed_start_station_id); }
                if (cr.proposed_end_station_id) { fields.push(`end_station_id = $${paramIndex++}`); params.push(cr.proposed_end_station_id); }
                if (cr.proposed_departure_time) { fields.push(`departure_time = $${paramIndex++}`); params.push(cr.proposed_departure_time); }
                if (cr.proposed_arrival_time) { fields.push(`arrival_time = $${paramIndex++}`); params.push(cr.proposed_arrival_time); }
                if (cr.proposed_train_class) { fields.push(`train_class = $${paramIndex++}`); params.push(cr.proposed_train_class); }
                if (cr.proposed_frequency) { fields.push(`frequency = $${paramIndex++}`); params.push(cr.proposed_frequency); }

                if (fields.length > 0) {
                    params.push(cr.timetable_id);
                    await pool.query(`
                        UPDATE sri_lanka_timetable 
                        SET ${fields.join(', ')} 
                        WHERE id = $${paramIndex}
                    `, params);
                }
            } else if (cr.change_type === 'add') {
                await pool.query(`
                    INSERT INTO sri_lanka_timetable 
                        (train_no, train_name, route_name, start_station_id, end_station_id, 
                         departure_time, arrival_time, train_class, frequency)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    cr.proposed_train_no, cr.proposed_train_name, cr.proposed_route_name,
                    cr.proposed_start_station_id, cr.proposed_end_station_id,
                    cr.proposed_departure_time, cr.proposed_arrival_time,
                    cr.proposed_train_class || '2nd, 3rd Class', cr.proposed_frequency || 'Daily'
                ]);
            } else if (cr.change_type === 'delete') {
                await pool.query('DELETE FROM sri_lanka_timetable WHERE id = $1', [cr.timetable_id]);
            }
        }

        await pool.query(`
            UPDATE timetable_change_requests 
            SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = NOW() 
            WHERE id = $4
        `, [status, review_note || '', req.user.userId, id]);

        return res.status(200).json({ success: true, message: `Change request ${status} successfully` });
    } catch (error) {
        console.error('Review change request error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/timetable
// Admin adds a new timetable entry directly
router.post('/', authenticate, authorize(['admin', 'ceylon-track-admin']), async (req, res) => {
    try {
        const {
            train_no, train_name, route_name, start_station_id, end_station_id,
            departure_time, arrival_time, train_class, frequency
        } = req.body;

        if (!train_no || !start_station_id || !end_station_id) {
            return res.status(400).json({ error: 'Train number, start station, and end station are required' });
        }

        const result = await pool.query(`
            INSERT INTO sri_lanka_timetable 
                (train_no, train_name, route_name, start_station_id, end_station_id, 
                 departure_time, arrival_time, train_class, frequency)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            train_no, train_name || '', route_name || '', start_station_id, end_station_id,
            departure_time || null, arrival_time || null, train_class || '2nd, 3rd Class', frequency || 'Daily'
        ]);

        return res.status(201).json({ success: true, id: result.rows[0].id, message: 'Timetable entry created' });
    } catch (error) {
        console.error('Create timetable error:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Train number already exists' });
        }
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

// PUT /api/timetable/:id
// Admin edits a timetable entry directly
router.put('/:id', authenticate, authorize(['admin', 'ceylon-track-admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const {
            train_no, train_name, route_name, start_station_id, end_station_id,
            departure_time, arrival_time, train_class, frequency
        } = req.body;

        if (!train_no || !start_station_id || !end_station_id) {
            return res.status(400).json({ error: 'Train number, start station, and end station are required' });
        }

        const result = await pool.query(`
            UPDATE sri_lanka_timetable 
            SET train_no = $1, train_name = $2, route_name = $3, 
                start_station_id = $4, end_station_id = $5, 
                departure_time = $6, arrival_time = $7, 
                train_class = $8, frequency = $9
            WHERE id = $10
        `, [
            train_no, train_name || '', route_name || '', start_station_id, end_station_id,
            departure_time || null, arrival_time || null, train_class || '2nd, 3rd Class', frequency || 'Daily',
            id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Timetable entry not found' });
        }

        return res.status(200).json({ success: true, message: 'Timetable entry updated' });
    } catch (error) {
        console.error('Update timetable error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/timetable/:id
// Admin deletes a timetable entry directly
router.delete('/:id', authenticate, authorize(['admin', 'ceylon-track-admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const result = await pool.query('DELETE FROM sri_lanka_timetable WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Timetable entry not found' });
        }
        return res.status(200).json({ success: true, message: 'Timetable entry deleted' });
    } catch (error) {
        console.error('Delete timetable error:', error);
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

// POST /api/timetable/:id/stops
// Admin sets the intermediate stops for a timetable entry
router.post('/:id/stops', authenticate, authorize(['admin', 'ceylon-track-admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const id = parseInt(req.params.id, 10);
        const { stops } = req.body; // Expects an array: [ { station_id, arrival_time, departure_time, stop_sequence }, ... ]

        if (!Array.isArray(stops)) {
            return res.status(400).json({ error: 'Stops must be an array' });
        }

        await client.query('BEGIN');

        // Verify timetable entry exists
        const check = await client.query('SELECT id FROM sri_lanka_timetable WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Timetable entry not found' });
        }

        // Delete existing stops
        await client.query('DELETE FROM timetable_stops WHERE timetable_id = $1', [id]);

        // Insert new stops
        for (const stop of stops) {
            await client.query(`
                INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                id, stop.station_id, stop.arrival_time || null, stop.departure_time || null, stop.stop_sequence
            ]);
        }

        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Stops updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update stops error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
