const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// GET /api/schedules - Show available schedule endpoints
router.get('/', (req, res) => {
    res.json({
        message: 'Schedule endpoints',
        endpoints: {
            search: 'GET /api/schedules/search?from=CODE&to=CODE&date=YYYY-MM-DD',
            detail: 'GET /api/schedules/:id',
            all: 'GET /api/schedules/all'
        }
    });
});

// GET /api/schedules/search - Search for train schedules
// Query params: from, to, date
router.get('/search', async (req, res) => {
    try {
        const { from, to, date } = req.query;

        // Validation
        if (!from || !to || !date) {
            return res.status(400).json({
                error: 'Missing required parameters: from, to, and date are required'
            });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                error: 'Invalid date format. Please use YYYY-MM-DD'
            });
        }

        // Get day of week (0=Sunday, 6=Saturday)
        const searchDate = new Date(date);
        const dayOfWeek = searchDate.getDay();

        // Validate station codes
        const stationCheck = await pool.query(
            'SELECT code FROM Station WHERE code IN ($1, $2)',
            [from.toUpperCase(), to.toUpperCase()]
        );

        if (stationCheck.rows.length < 2) {
            return res.status(404).json({
                error: 'One or both station codes not found'
            });
        }

        // Simplified search query
        const query = `
            SELECT 
                s.id as schedule_id,
                t.name as train_name,
                t.number as train_number,
                t.type as train_type,
                r.name as route_name,
                r.type as route_type,
                st_from.name as from_station,
                st_to.name as to_station,
                sst_from.departure_time,
                sst_to.arrival_time,
                sst_from.day_offset as from_day_offset,
                sst_to.day_offset as to_day_offset,
                COALESCE(tsu.status, 'Not Started') as current_status,
                COALESCE(tsu.delay_minutes, 0) as delay_minutes,
                (rs_to.distance_from_origin - rs_from.distance_from_origin) as distance_km,
                EXTRACT(EPOCH FROM (sst_to.arrival_time - sst_from.departure_time))/60 + 
                    (sst_to.day_offset - sst_from.day_offset) * 1440 as duration_minutes,
                CASE 
                    WHEN tsu.status = 'Cancelled' THEN 'Cancelled'
                    WHEN tsu.delay_minutes = 0 OR tsu.delay_minutes IS NULL THEN 'On Time'
                    ELSE 'Delayed'
                END as display_status
            FROM Schedule s
            JOIN Train t ON s.train_id = t.id
            JOIN Route r ON s.route_id = r.id
            JOIN ScheduleStationTiming sst_from ON sst_from.schedule_id = s.id
            JOIN ScheduleStationTiming sst_to ON sst_to.schedule_id = s.id
            JOIN Station st_from ON st_from.id = sst_from.station_id AND st_from.code = $1
            JOIN Station st_to ON st_to.id = sst_to.station_id AND st_to.code = $2
            JOIN RouteStation rs_from ON rs_from.route_id = r.id AND rs_from.station_id = st_from.id
            JOIN RouteStation rs_to ON rs_to.route_id = r.id AND rs_to.station_id = st_to.id
            JOIN ScheduleDays sd ON sd.schedule_id = s.id AND sd.day_of_week = $3
            LEFT JOIN TripStatusUpdate tsu ON tsu.schedule_id = s.id AND tsu.trip_date = $4
            WHERE 
                s.active = true
                AND sst_from.stop_sequence < sst_to.stop_sequence
                AND (s.effective_end_date IS NULL OR s.effective_end_date >= $4)
                AND s.effective_start_date <= $4
            ORDER BY sst_from.departure_time
        `;

        try {
            const result = await pool.query(query, [
                from.toUpperCase(),
                to.toUpperCase(),
                dayOfWeek,
                date
            ]);

            if (result.rows.length === 0) {
                return res.json({
                    message: 'No schedules found for the selected route and date',
                    schedules: []
                });
            }

            // Format the response
            const schedules = result.rows.map(row => {
            const durationHours = Math.floor(row.duration_minutes / 60);
            const durationMins = Math.floor(row.duration_minutes % 60);
            
            // Calculate expected arrival with delay
            const baseArrival = row.arrival_time;
            const totalDelayMinutes = parseInt(row.delay_minutes) || 0;
            
            // Format times
            const formatTime = (timeStr) => {
                if (!timeStr) return null;
                return timeStr.substring(0, 5); // HH:MM format
            };

            // Determine badge type
            let badge = 'Usually On Time';
            let badgeClass = 'ontime';
            
            if (row.current_status === 'Cancelled' || row.display_status === 'Cancelled') {
                badge = 'Cancelled';
                badgeClass = 'cancelled';
            } else if (row.delay_minutes > 15) {
                badge = 'Significantly Delayed';
                badgeClass = 'delayed';
            } else if (row.delay_minutes > 0) {
                badge = 'Sometimes Delayed';
                badgeClass = 'delayed';
            }

            return {
                schedule_id: row.schedule_id,
                train: {
                    name: row.train_name,
                    number: row.train_number,
                    type: row.train_type
                },
                route: {
                    name: row.route_name,
                    type: row.route_type
                },
                from_station: row.from_station,
                to_station: row.to_station,
                departure_time: formatTime(row.departure_time),
                arrival_time: formatTime(row.arrival_time),
                duration: {
                    minutes: parseInt(row.duration_minutes),
                    formatted: `${durationHours}h ${durationMins}m`
                },
                distance_km: parseFloat(row.distance_km).toFixed(2),
                status: {
                    current: row.current_status,
                    display: row.display_status,
                    delay_minutes: parseInt(row.delay_minutes),
                    badge: badge,
                    badge_class: badgeClass
                },
                date: date
            };
        });

        res.json({
            search_params: {
                from: from.toUpperCase(),
                to: to.toUpperCase(),
                date: date,
                day_of_week: dayOfWeek
            },
            count: schedules.length,
            schedules: schedules
        });

    } catch (error) {
        console.error('Schedule search error:', error);
        res.status(500).json({
            error: 'Internal server error during schedule search'
        });
    }
});

// GET /api/schedules/:id - Get detailed schedule information
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        const query = `
            SELECT 
                s.id,
                t.name as train_name,
                t.number as train_number,
                t.capacity,
                r.name as route_name,
                r.type as route_type,
                COALESCE(tsu.status, 'Not Started') as current_status,
                COALESCE(tsu.delay_minutes, 0) as delay_minutes,
                tsu.last_updated
            FROM Schedule s
            JOIN Train t ON s.train_id = t.id
            JOIN Route r ON s.route_id = r.id
            LEFT JOIN TripStatusUpdate tsu ON tsu.schedule_id = s.id 
                AND tsu.trip_date = COALESCE($2, CURRENT_DATE)
            WHERE s.id = $1
        `;

        const result = await pool.query(query, [id, date]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Get full station timings
        const timingsQuery = `
            SELECT 
                st.name as station_name,
                st.code as station_code,
                sst.arrival_time,
                sst.departure_time,
                sst.day_offset,
                sst.stop_sequence,
                sst.stop_duration_minutes
            FROM ScheduleStationTiming sst
            JOIN Station st ON sst.station_id = st.id
            WHERE sst.schedule_id = $1
            ORDER BY sst.stop_sequence
        `;

        const timingsResult = await pool.query(timingsQuery, [id]);

        res.json({
            schedule: result.rows[0],
            stations: timingsResult.rows
        });

    } catch (error) {
        console.error('Schedule detail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
