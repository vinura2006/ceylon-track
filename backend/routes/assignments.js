const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// GET /api/assignments/my-active
// Returns the current active assignment for the staff member
router.get('/my-active', authenticate, authorize(['staff', 'admin']), async (req, res) => {
    try {
        const query = `
            SELECT a.id, a.schedule_id as "scheduleId", s.train_number as "trainNumber", s.train_name as "trainName", a.assigned_at as "assignedAt"
            FROM train_assignments a
            JOIN schedules s ON a.schedule_id = s.id
            WHERE a.user_id = $1 AND a.is_active = true
            LIMIT 1
        `;
        const result = await pool.query(query, [req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(200).json({ assignment: null });
        }

        return res.status(200).json({ assignment: result.rows[0] });
    } catch (error) {
        console.error('Get my active assignment error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assignments/start
// Assigns staff to a schedule
router.post('/start', authenticate, authorize(['staff', 'admin']), async (req, res) => {
    try {
        const { schedule_id } = req.body;
        const scheduleId = parseInt(schedule_id, 10);
        
        if (isNaN(scheduleId)) {
            return res.status(400).json({ error: 'Invalid schedule ID' });
        }

        // Check if schedule is already assigned to someone else
        const existingAssignment = await pool.query(
            'SELECT user_id FROM train_assignments WHERE schedule_id = $1 AND is_active = true AND user_id != $2',
            [scheduleId, req.user.userId]
        );
        if (existingAssignment.rows.length > 0) {
            return res.status(409).json({ error: 'Train is already actively assigned to another staff member' });
        }

        // Deactivate previous active assignments for this user
        await pool.query('UPDATE train_assignments SET is_active = false WHERE user_id = $1 AND is_active = true', [req.user.userId]);

        // Create new active assignment
        const result = await pool.query(
            `INSERT INTO train_assignments (user_id, schedule_id, is_active)
             VALUES ($1, $2, true)
             RETURNING id, schedule_id as "scheduleId", assigned_at as "assignedAt"`,
            [req.user.userId, scheduleId]
        );

        return res.status(200).json({ assignment: result.rows[0], message: 'Started broadcasting assignment' });
    } catch (error) {
        console.error('Start assignment error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assignments/stop
// Ends the current assignment
router.post('/stop', authenticate, authorize(['staff', 'admin']), async (req, res) => {
    try {
        await pool.query('UPDATE train_assignments SET is_active = false WHERE user_id = $1 AND is_active = true', [req.user.userId]);
        return res.status(200).json({ message: 'Stopped broadcasting assignment' });
    } catch (error) {
        console.error('Stop assignment error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
