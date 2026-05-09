/**
 * Calculates reliability and punctuality percent for given schedule IDs.
 * 
 * @param {Object} pool - The database connection pool.
 * @param {Array<Number>} scheduleIds - An array of schedule IDs.
 * @returns {Promise<Object>} An object mapping schedule IDs to their reliability data.
 */
async function calculateReliability(pool, scheduleIds) {
    const reliabilityData = {};

    for (const scheduleId of scheduleIds) {
        const reliabilityQuery = `
            SELECT 
                COUNT(*) as total_trips,
                SUM(CASE WHEN delay_minutes <= 5 THEN 1 ELSE 0 END) as on_time_trips
            FROM TripStatusUpdate
            WHERE schedule_id = $1
            AND trip_date >= CURRENT_DATE - INTERVAL '30 days'
        `;
        const reliabilityResult = await pool.query(reliabilityQuery, [scheduleId]);
        
        const totalTrips = parseInt(reliabilityResult.rows[0].total_trips) || 0;
        const onTimeTrips = parseInt(reliabilityResult.rows[0].on_time_trips) || 0;
        
        let punctualityPercent = 0;
        let reliability = 'medium';
        
        if (totalTrips > 0) {
            punctualityPercent = Math.round((onTimeTrips / totalTrips) * 100);
            
            if (punctualityPercent >= 80) {
                reliability = 'high';
            } else if (punctualityPercent >= 50) {
                reliability = 'medium';
            } else {
                reliability = 'low';
            }
        }
        
        reliabilityData[scheduleId] = {
            reliability: reliability,
            punctuality_percent: punctualityPercent
        };
    }

    return reliabilityData;
}

/**
 * Formats time from HH:MM:SS to HH:MM.
 * 
 * @param {String} timeStr - Time string.
 * @returns {String|null} Formatted time or null.
 */
function formatTime(timeStr) {
    if (!timeStr) return null;
    return timeStr.substring(0, 5); // HH:MM format
}

/**
 * Calculates variation in base durations based on train type and schedule,
 * then formats the output duration and arrival time.
 * 
 * @param {Object} row - Database row object containing schedule data.
 * @returns {Object} Containing departure time, new arrival time, and duration info.
 */
function formatScheduleTimeAndDuration(row) {
    let baseDuration = parseInt(row.duration_minutes);
    
    if (row.train_type === 'Intercity') {
        baseDuration = baseDuration - (row.schedule_id * 3 % 20) - 5; // Intercity is faster
    } else if (row.train_type === 'Commuter') {
        baseDuration = baseDuration + (row.schedule_id * 5 % 30) + 15; // Commuter is slower
    } else {
        baseDuration = baseDuration + (row.schedule_id * 2 % 15);
    }
    
    if (baseDuration < 10) baseDuration = 10;

    const durationHours = Math.floor(baseDuration / 60);
    const durationMins = Math.floor(baseDuration % 60);
    
    const departureTimeStr = formatTime(row.departure_time);
    let newArrivalTimeStr = formatTime(row.arrival_time);

    // Recalculate arrival time so it matches the new varied duration
    if (departureTimeStr) {
        const [depH, depM] = departureTimeStr.split(':').map(Number);
        let totalMins = depH * 60 + depM + baseDuration;
        const arrH = Math.floor(totalMins / 60) % 24;
        const arrM = totalMins % 60;
        newArrivalTimeStr = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
    }

    return {
        departureTimeStr,
        newArrivalTimeStr,
        durationMinutes: baseDuration,
        formattedDuration: `${durationHours}h ${durationMins}m`
    };
}

/**
 * Determines the status badge for a train based on its delay.
 * 
 * @param {Object} row - Database row object containing status data.
 * @returns {Object} Containing badge name and CSS class.
 */
function determineStatusBadge(row) {
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

    return { badge, badgeClass };
}

/**
 * Determines the available seating classes for a given train.
 * 
 * @param {String} trainName - Name of the train.
 * @param {String} trainType - Type of the train (e.g., Commuter).
 * @returns {Array<Number>} List of available classes (1, 2, 3).
 */
function getAvailableClasses(trainName, trainType) {
    // Full service (1st, 2nd, 3rd)
    if (['Yal Devi', 'Udarata Menike', 'Podi Menike', 'Meena Gaya', 'Badulla Night Mail', 'Batticaloa Express', 'Trincomalee Night Mail'].includes(trainName)) {
        return [1, 2, 3]; 
    } 
    // Premium Intercity Express (1st, 2nd only - NO 3rd class)
    else if (['Uttara Devi', 'Ruhunu Kumari', 'Galu Kumari', 'Tikiri Menike'].includes(trainName)) {
        return [1, 2]; 
    } 
    // Standard express (2nd, 3rd only - NO 1st class)
    else if (['Rajarata Rejini', 'Sagarika', 'Udaya Devi', 'Senkadagala Menike'].includes(trainName)) {
        return [2, 3]; 
    } 
    // Commuter trains (3rd class only)
    else if (trainType === 'Commuter' || trainName === 'Muthu Kumari') {
        return [3]; 
    }
    
    return [1, 2, 3]; // Default fallback
}

module.exports = {
    calculateReliability,
    formatScheduleTimeAndDuration,
    determineStatusBadge,
    getAvailableClasses
};
