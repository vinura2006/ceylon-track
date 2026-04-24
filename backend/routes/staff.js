const express = require('express');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const router = express.Router();

/**
 * POST /api/staff/trains/:id/status
 * Updates or creates a TripStatusUpdate record for the given schedule on today's date.
 * Requires Staff or Admin role.
 * Request body: { delay_minutes: number, status: string, notes: string }
 */
router.post('/trains/:id/status', authenticateToken, authorize(['Staff', 'Admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { delay_minutes, status, notes } = req.body;

        // Validate required fields
        if (delay_minutes === undefined || delay_minutes === null) {
            return res.status(400).json({
                error: 'delay_minutes is required'
            });
        }

        // Check if a TripStatusUpdate already exists for today
        const checkQuery = `
            SELECT id FROM TripStatusUpdate
            WHERE schedule_id = $1 AND trip_date = CURRENT_DATE
        `;
        const checkResult = await pool.query(checkQuery, [id]);

        let result;
        const statusValue = status || 'Delayed';
        const delayValue = parseInt(delay_minutes) || 0;
        const notesValue = notes || '';

        if (checkResult.rows.length > 0) {
            // Update existing record
            const updateQuery = `
                UPDATE TripStatusUpdate
                SET status = $1,
                    delay_minutes = $2,
                    last_updated = CURRENT_TIMESTAMP,
                    notes = $3
                WHERE schedule_id = $4 AND trip_date = CURRENT_DATE
                RETURNING *
            `;
            result = await pool.query(updateQuery, [
                statusValue,
                delayValue,
                notesValue,
                id
            ]);
        } else {
            // Insert new record (default current_station_id = 1 for Colombo Fort)
            const insertQuery = `
                INSERT INTO TripStatusUpdate
                    (schedule_id, trip_date, current_station_id, status, delay_minutes, last_updated, notes)
                VALUES
                    ($1, CURRENT_DATE, 1, $2, $3, CURRENT_TIMESTAMP, $4)
                RETURNING *
            `;
            result = await pool.query(insertQuery, [
                id,
                statusValue,
                delayValue,
                notesValue
            ]);
        }

        res.json({
            success: true,
            message: 'Train status updated successfully',
            update: result.rows[0]
        });

    } catch (error) {
        console.error('Staff status update error:', error);
        res.status(500).json({
            error: 'Internal server error while updating train status'
        });
    }
});

module.exports = router;
