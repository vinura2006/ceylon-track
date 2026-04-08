/**
 * Feature 2: Train Search API Endpoint
 * GET /api/trains/search - Search for trains by route and date
 * Includes validation, error handling, and detailed response
 */

const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

/**
 * Feature 3: Reliability Badge System
 * Calculate train reliability based on last 30 days of trip history
 * @param {number} trainId - The train ID to calculate reliability for
 * @returns {Object} Reliability data with score, badge, and statistics
 */
async function calculateTrainReliability(trainId) {
    try {
        // Query last 30 days of trip status data for this train
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const reliabilityQuery = await pool.query(
            `SELECT 
                COUNT(*) as total_trips,
                SUM(CASE 
                    WHEN delay_minutes >= 0 AND delay_minutes <= 5 THEN 1 
                    ELSE 0 
                END) as on_time_count,
                SUM(CASE 
                    WHEN delay_minutes > 5 AND delay_minutes <= 15 THEN 1 
                    ELSE 0 
                END) as slightly_delayed_count,
                SUM(CASE 
                    WHEN delay_minutes > 15 THEN 1 
                    ELSE 0 
                END) as delayed_count,
                AVG(delay_minutes) as avg_delay_minutes,
                MAX(delay_minutes) as max_delay_minutes
            FROM TripStatusUpdate tsu
            JOIN Schedule s ON tsu.schedule_id = s.id
            WHERE s.train_id = $1 
              AND tsu.trip_date >= $2
              AND tsu.trip_date <= CURRENT_DATE`,
            [trainId, thirtyDaysAgo]
        );

        const stats = reliabilityQuery.rows[0];
        const totalTrips = parseInt(stats.total_trips) || 0;
        const onTimeCount = parseInt(stats.on_time_count) || 0;
        
        // Calculate on-time percentage
        const onTimePercentage = totalTrips > 0 
            ? Math.round((onTimeCount / totalTrips) * 100) 
            : 0;
        
        // Determine reliability badge based on on-time percentage
        // High: 80%+ on time
        // Medium: 50-79% on time  
        // Low: Under 50% on time
        let reliabilityLevel;
        let badgeColor;
        let badgeText;
        
        if (onTimePercentage >= 80) {
            reliabilityLevel = 'high';
            badgeColor = 'green';
            badgeText = 'High Reliability';
        } else if (onTimePercentage >= 50) {
            reliabilityLevel = 'medium';
            badgeColor = 'orange';
            badgeText = 'Medium Reliability';
        } else {
            reliabilityLevel = 'low';
            badgeColor = 'red';
            badgeText = 'Low Reliability';
        }

        return {
            score: onTimePercentage,
            level: reliabilityLevel,
            badge: {
                text: badgeText,
                color: badgeColor
            },
            statistics: {
                total_trips_last_30_days: totalTrips,
                on_time_count: onTimeCount,
                slightly_delayed_count: parseInt(stats.slightly_delayed_count) || 0,
                delayed_count: parseInt(stats.delayed_count) || 0,
                on_time_percentage: onTimePercentage,
                average_delay_minutes: Math.round(parseFloat(stats.avg_delay_minutes) || 0),
                max_delay_minutes: parseInt(stats.max_delay_minutes) || 0
            }
        };
    } catch (error) {
        console.error('Error calculating reliability:', error);
        // Return default reliability if calculation fails
        return {
            score: 0,
            level: 'unknown',
            badge: {
                text: 'Unknown',
                color: 'gray'
            },
            statistics: {
                total_trips_last_30_days: 0,
                on_time_count: 0,
                slightly_delayed_count: 0,
                delayed_count: 0,
                on_time_percentage: 0,
                average_delay_minutes: 0,
                max_delay_minutes: 0
            }
        };
    }
}

/**
 * GET /api/trains/search
 * Search trains by origin, destination, and date
 * Query params:
 *   - from: Origin station name or code (required)
 *   - to: Destination station name or code (required)
 *   - date: Travel date in YYYY-MM-DD format (required)
 */
router.get('/search', async (req, res) => {
    try {
        // Extract query parameters
        const { from, to, date } = req.query;

        // Validation: Check required parameters
        if (!from || !to || !date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                message: 'Please provide from, to, and date query parameters',
                required_params: {
                    from: 'Origin station name or code (e.g., CMB or Colombo Fort)',
                    to: 'Destination station name or code (e.g., GAL or Galle)',
                    date: 'Travel date in YYYY-MM-DD format'
                }
            });
        }

        // Validation: Check date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Date must be in YYYY-MM-DD format',
                provided_date: date,
                example: '2026-04-15'
            });
        }

        // Validation: Check if date is valid calendar date
        const searchDate = new Date(date);
        if (isNaN(searchDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date',
                message: 'The provided date is not a valid calendar date',
                provided_date: date
            });
        }

        // Calculate day of week (0=Sunday, 6=Saturday) for schedule matching
        const dayOfWeek = searchDate.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Look up stations - try to match by code first, then by name
        const fromStationQuery = await pool.query(
            `SELECT id, name, code FROM Station 
             WHERE code = $1 OR LOWER(name) = LOWER($1)`,
            [from]
        );

        const toStationQuery = await pool.query(
            `SELECT id, name, code FROM Station 
             WHERE code = $1 OR LOWER(name) = LOWER($1)`,
            [to]
        );

        // Error: Origin station not found
        if (fromStationQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Station not found',
                message: `Origin station "${from}" does not exist in our database`,
                suggestion: 'Use station code (e.g., CMB, GAL, KAN) or full station name'
            });
        }

        // Error: Destination station not found
        if (toStationQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Station not found',
                message: `Destination station "${to}" does not exist in our database`,
                suggestion: 'Use station code (e.g., CMB, GAL, KAN) or full station name'
            });
        }

        const fromStation = fromStationQuery.rows[0];
        const toStation = toStationQuery.rows[0];

        // Error: Same origin and destination
        if (fromStation.id === toStation.id) {
            return res.status(400).json({
                success: false,
                error: 'Invalid route',
                message: 'Origin and destination stations cannot be the same'
            });
        }

        // Main search query: Find trains that stop at both stations
        // with the origin coming before destination in the route sequence
        const searchQuery = `
            SELECT DISTINCT
                s.id AS schedule_id,
                t.id AS train_id,
                t.name AS train_name,
                t.number AS train_number,
                t.type AS train_type,
                t.capacity AS train_capacity,
                r.name AS route_name,
                r.type AS route_type,
                from_st.name AS from_station,
                from_st.code AS from_station_code,
                to_st.name AS to_station,
                to_st.code AS to_station_code,
                sst_from.departure_time,
                sst_to.arrival_time,
                sst_from.day_offset AS from_day_offset,
                sst_to.day_offset AS to_day_offset,
                sst_from.stop_sequence AS from_sequence,
                sst_to.stop_sequence AS to_sequence,
                (sst_to.stop_sequence - sst_from.stop_sequence - 1) AS intermediate_stops,
                (rs_to.distance_from_origin - rs_from.distance_from_origin) AS distance_km,
                EXTRACT(EPOCH FROM (sst_to.arrival_time - sst_from.departure_time))/60 + 
                    (sst_to.day_offset - sst_from.day_offset) * 1440 AS duration_minutes,
                COALESCE(tsu.status, 'On Time') AS current_status,
                COALESCE(tsu.delay_minutes, 0) AS delay_minutes,
                tsu.last_updated,
                tsu.notes AS status_notes
            FROM Schedule s
            JOIN Train t ON s.train_id = t.id
            JOIN Route r ON s.route_id = r.id
            JOIN ScheduleStationTiming sst_from ON sst_from.schedule_id = s.id
            JOIN ScheduleStationTiming sst_to ON sst_to.schedule_id = s.id
            JOIN Station from_st ON from_st.id = sst_from.station_id
            JOIN Station to_st ON to_st.id = sst_to.station_id
            JOIN RouteStation rs_from ON rs_from.route_id = r.id AND rs_from.station_id = from_st.id
            JOIN RouteStation rs_to ON rs_to.route_id = r.id AND rs_to.station_id = to_st.id
            JOIN ScheduleDays sd ON sd.schedule_id = s.id AND sd.day_of_week = $3
            LEFT JOIN TripStatusUpdate tsu ON tsu.schedule_id = s.id AND tsu.trip_date = $4
            WHERE 
                s.active = true
                AND from_st.id = $1
                AND to_st.id = $2
                AND sst_from.stop_sequence < sst_to.stop_sequence
                AND (s.effective_end_date IS NULL OR s.effective_end_date >= $4)
                AND s.effective_start_date <= $4
            ORDER BY sst_from.departure_time
        `;

        const trainResults = await pool.query(searchQuery, [
            fromStation.id,
            toStation.id,
            dayOfWeek,
            date
        ]);

        // No trains found for this route on this date
        if (trainResults.rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No trains found for the selected route and date',
                search_params: {
                    from: fromStation.name,
                    from_code: fromStation.code,
                    to: toStation.name,
                    to_code: toStation.code,
                    date: date,
                    day_of_week: dayNames[dayOfWeek]
                },
                trains: [],
                count: 0
            });
        }

        // Fetch fare information for the route
        const fareQuery = await pool.query(
            `SELECT class_type, price 
             FROM RouteFare rf
             JOIN RouteStation rs_from ON rs_from.route_id = rf.route_id
             JOIN RouteStation rs_to ON rs_to.route_id = rf.route_id
             WHERE rs_from.station_id = $1 
               AND rs_to.station_id = $2
             ORDER BY class_type`,
            [fromStation.id, toStation.id]
        );

        // Format fares by class
        const fares = {};
        fareQuery.rows.forEach(fare => {
            const className = fare.class_type === 1 ? '1st' : fare.class_type === 2 ? '2nd' : '3rd';
            fares[className] = {
                class_type: fare.class_type,
                class_name: className,
                price: parseFloat(fare.price).toFixed(2),
                currency: 'LKR'
            };
        });

        // Format the response with detailed train information and reliability data
        const formattedTrains = await Promise.all(trainResults.rows.map(async (train) => {
            const durationHours = Math.floor(train.duration_minutes / 60);
            const durationMins = Math.floor(train.duration_minutes % 60);
            
            // Format times to HH:MM
            const formatTime = (timeStr) => {
                if (!timeStr) return null;
                return timeStr.substring(0, 5);
            };

            // Calculate expected arrival with delay
            const delayMinutes = parseInt(train.delay_minutes) || 0;
            const displayStatus = delayMinutes === 0 ? 'On Time' : 
                                  delayMinutes > 0 && delayMinutes <= 15 ? 'Slightly Delayed' : 
                                  'Delayed';

            // Feature 3: Calculate reliability badge for this train
            const reliability = await calculateTrainReliability(train.train_id);

            return {
                schedule_id: train.schedule_id,
                train_id: train.train_id,
                train: {
                    name: train.train_name,
                    number: train.train_number,
                    type: train.train_type,
                    capacity: train.train_capacity
                },
                route: {
                    name: train.route_name,
                    type: train.route_type,
                    from_station: {
                        name: train.from_station,
                        code: train.from_station_code
                    },
                    to_station: {
                        name: train.to_station,
                        code: train.to_station_code
                    },
                    distance_km: parseFloat(train.distance_km).toFixed(2)
                },
                timing: {
                    departure_time: formatTime(train.departure_time),
                    arrival_time: formatTime(train.arrival_time),
                    duration: {
                        hours: durationHours,
                        minutes: durationMins,
                        formatted: `${durationHours}h ${durationMins}m`,
                        total_minutes: parseInt(train.duration_minutes)
                    },
                    intermediate_stops: parseInt(train.intermediate_stops),
                    overnight_journey: train.to_day_offset > train.from_day_offset
                },
                status: {
                    current: train.current_status,
                    display: displayStatus,
                    delay_minutes: delayMinutes,
                    last_updated: train.last_updated,
                    notes: train.status_notes
                },
                reliability: reliability,  // Feature 3: Include reliability badge data
                fares: fares,
                available_classes: Object.keys(fares)
            };
        }));

        // Successful response
        res.status(200).json({
            success: true,
            message: `Found ${formattedTrains.length} train(s) from ${fromStation.name} to ${toStation.name}`,
            search_params: {
                from: fromStation.name,
                from_code: fromStation.code,
                to: toStation.name,
                to_code: toStation.code,
                date: date,
                day_of_week: dayNames[dayOfWeek]
            },
            trains: formattedTrains,
            count: formattedTrains.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // Log error for debugging
        console.error('Train search error:', error);
        
        // Return user-friendly error message
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An error occurred while searching for trains. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/trains/
 * List all available trains (for dropdown/autocomplete)
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.id, t.name, t.number, t.type, t.capacity
             FROM Train t
             WHERE t.active = true
             ORDER BY t.number`
        );

        res.status(200).json({
            success: true,
            trains: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching trains:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to fetch train list'
        });
    }
});

/**
 * Feature 4: Full Route Details API
 * GET /api/trains/:trainId/route - Get complete stop-by-stop journey details
 */
router.get('/:trainId/route', async (req, res) => {
    try {
        const { trainId } = req.params;
        const { date } = req.query;

        // Validate trainId is a number
        if (!trainId || isNaN(parseInt(trainId))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid train ID',
                message: 'Train ID must be a valid number'
            });
        }

        const trainIdNum = parseInt(trainId);
        const travelDate = date || new Date().toISOString().split('T')[0];

        // Get train basic information
        const trainQuery = await pool.query(
            `SELECT t.id, t.name, t.number, t.type, t.capacity, 
                    r.name as route_name, r.type as route_type,
                    s.id as schedule_id, s.effective_start_date, s.effective_end_date
             FROM Train t
             JOIN Schedule s ON s.train_id = t.id
             JOIN Route r ON s.route_id = r.id
             WHERE t.id = $1 AND s.active = true
             LIMIT 1`,
            [trainIdNum]
        );

        if (trainQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Train not found',
                message: `No active train found with ID ${trainIdNum}`
            });
        }

        const train = trainQuery.rows[0];

        // Get stop-by-stop journey details
        const stopsQuery = await pool.query(
            `SELECT 
                st.name as station_name,
                st.code as station_code,
                st.is_major,
                sst.arrival_time,
                sst.departure_time,
                sst.stop_sequence,
                sst.stop_duration_minutes,
                sst.day_offset,
                rs.distance_from_origin,
                COALESCE(tsu.status, 'On Time') as current_status,
                COALESCE(tsu.delay_minutes, 0) as current_delay,
                tsu.notes as status_notes
            FROM ScheduleStationTiming sst
            JOIN Station st ON st.id = sst.station_id
            JOIN RouteStation rs ON rs.station_id = st.id 
                AND rs.route_id = (SELECT route_id FROM Schedule WHERE id = $1)
            LEFT JOIN TripStatusUpdate tsu ON tsu.schedule_id = sst.schedule_id 
                AND tsu.trip_date = $2
                AND tsu.current_station_id = st.id
            WHERE sst.schedule_id = $1
            ORDER BY sst.stop_sequence`,
            [train.schedule_id, travelDate]
        );

        if (stopsQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Route details not found',
                message: 'No route stops found for this train schedule'
            });
        }

        // Format times helper
        const formatTime = (timeStr) => {
            if (!timeStr) return null;
            return timeStr.substring(0, 5);
        };

        // Format stops with platform numbers and delay information
        const formattedStops = stopsQuery.rows.map((stop, index) => {
            const isFirst = index === 0;
            const isLast = index === stopsQuery.rows.length - 1;
            
            // Calculate platform number (mock logic based on station importance and sequence)
            // In real implementation, this would come from station/platform database
            let platform = '1';
            if (stop.is_major) {
                platform = stop.stop_sequence % 2 === 1 ? '1' : '2';
            }
            
            return {
                stop_sequence: stop.stop_sequence,
                station: {
                    name: stop.station_name,
                    code: stop.station_code,
                    is_major_station: stop.is_major
                },
                platform: platform,
                scheduled: {
                    arrival_time: isFirst ? null : formatTime(stop.arrival_time),
                    departure_time: isLast ? null : formatTime(stop.departure_time),
                    stop_duration_minutes: isFirst || isLast ? 0 : stop.stop_duration_minutes,
                    day_offset: stop.day_offset
                },
                current_status: {
                    status: stop.current_status,
                    delay_minutes: parseInt(stop.current_delay),
                    notes: stop.status_notes
                },
                distance: {
                    from_origin_km: parseFloat(stop.distance_from_origin).toFixed(2)
                }
            };
        });

        // Get current journey progress (which station the train is currently at)
        const progressQuery = await pool.query(
            `SELECT 
                st.name as current_station,
                st.code as current_station_code,
                tsu.status,
                tsu.delay_minutes,
                tsu.last_updated
            FROM TripStatusUpdate tsu
            JOIN Station st ON st.id = tsu.current_station_id
            WHERE tsu.schedule_id = $1 AND tsu.trip_date = $2`,
            [train.schedule_id, travelDate]
        );

        const currentProgress = progressQuery.rows.length > 0 ? {
            station: progressQuery.rows[0].current_station,
            station_code: progressQuery.rows[0].current_station_code,
            status: progressQuery.rows[0].status,
            delay_minutes: parseInt(progressQuery.rows[0].delay_minutes),
            last_updated: progressQuery.rows[0].last_updated
        } : null;

        // Calculate total journey statistics
        const firstStop = stopsQuery.rows[0];
        const lastStop = stopsQuery.rows[stopsQuery.rows.length - 1];
        const totalDistance = parseFloat(lastStop.distance_from_origin) - parseFloat(firstStop.distance_from_origin);
        
        // Calculate duration
        const durationMinutes = stopsQuery.rows.reduce((total, stop, index) => {
            if (index === 0) return 0;
            const prevStop = stopsQuery.rows[index - 1];
            const segmentMinutes = calculateSegmentDuration(prevStop, stop);
            return total + segmentMinutes;
        }, 0);

        // Successful response
        res.status(200).json({
            success: true,
            message: `Route details for ${train.name} (${train.number})`,
            train: {
                id: train.id,
                name: train.name,
                number: train.number,
                type: train.type,
                capacity: train.capacity
            },
            route: {
                name: train.route_name,
                type: train.route_type,
                total_stops: formattedStops.length,
                intermediate_stops: formattedStops.length - 2,
                total_distance_km: totalDistance.toFixed(2),
                total_duration_minutes: durationMinutes,
                journey_duration: formatDuration(durationMinutes)
            },
            travel_date: travelDate,
            current_progress: currentProgress,
            stops: formattedStops,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Route details error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to fetch route details',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Helper function to calculate segment duration between two stops
 */
function calculateSegmentDuration(fromStop, toStop) {
    if (!fromStop.departure_time || !toStop.arrival_time) return 0;
    
    const [fromHours, fromMins] = fromStop.departure_time.split(':').map(Number);
    const [toHours, toMins] = toStop.arrival_time.split(':').map(Number);
    
    let fromTotal = fromHours * 60 + fromMins;
    let toTotal = toHours * 60 + toMins;
    
    // Handle day offset
    if (toStop.day_offset > fromStop.day_offset) {
        toTotal += (toStop.day_offset - fromStop.day_offset) * 1440;
    }
    
    return toTotal - fromTotal;
}

/**
 * Helper function to format duration in hours and minutes
 */
function formatDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

module.exports = router;
