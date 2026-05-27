const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function buildJWT(user) {
    return jwt.sign(
        { userId: user.id, email: user.email, role: user.role, sub_role: user.sub_role, home_station_id: user.home_station_id },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function buildUserResponse(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        sub_role: user.sub_role,
        home_station_id: user.home_station_id,
        status: user.status,
        theme_preference: user.theme_preference
    };
}

// POST /register
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, first_name, last_name, role, employee_id, staff_access_code, sub_role } = req.body;

        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'All base fields are required' });
        }
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const allowedRoles = ['passenger', 'staff'];
        const finalRole = role || 'passenger';
        if (!allowedRoles.includes(finalRole)) {
            return res.status(400).json({ error: 'Invalid role. Public registration is for passenger or staff only.' });
        }

        let employeeId = null;
        let userStatus = 'active';

        if (role === 'staff') {
            if (!employee_id || !staff_access_code) {
                return res.status(400).json({ error: 'Employee ID and Staff Access Code are required for staff registration' });
            }
            if (staff_access_code !== 'SLR-STAFF-2026') {
                return res.status(403).json({ error: 'Invalid Staff Access Code' });
            }
            employeeId = employee_id;
            userStatus = 'pending';

            const empCheck = await pool.query('SELECT id FROM users WHERE employee_id = $1', [employeeId]);
            if (empCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Employee ID already registered' });
            }
        }

        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const finalSubRole = role === 'staff' ? (sub_role || 'staff') : null;

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, role, sub_role, employee_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, first_name, last_name, role, sub_role, employee_id, status, theme_preference',
            [email, passwordHash, first_name, last_name, finalRole, finalSubRole, employeeId, userStatus]
        );

        const user = result.rows[0];

        if (userStatus === 'pending') {
            return res.status(201).json({
                message: 'Your registration is pending admin approval.',
                status: 'pending',
                user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, status: 'pending' }
            });
        }

        const token = buildJWT(user);
        return res.status(201).json({ token, user: buildUserResponse(user) });
    } catch (error) {
        next(error);
    }
});

// POST /login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password, login_type, employee_id } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        let result;

        if (login_type === 'staff') {
            if (!employee_id && !email) {
                return res.status(400).json({ error: 'Email or Employee ID is required for staff login' });
            }
            if (employee_id) {
                result = await pool.query(
                    'SELECT * FROM users WHERE employee_id = $1 AND (role = $2 OR role = $3)',
                    [employee_id, 'staff', 'ceylon-track-admin']
                );
            } else {
                result = await pool.query(
                    'SELECT * FROM users WHERE email = $1 AND (role = $2 OR role = $3)',
                    [email, 'staff', 'ceylon-track-admin']
                );
            }
        } else if (login_type === 'admin') {
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }
            result = await pool.query(
                "SELECT * FROM users WHERE email = $1 AND (role = 'ceylon-track-admin' OR role = 'admin')",
                [email]
            );
        } else {
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }
            result = await pool.query("SELECT * FROM users WHERE email = $1 AND role != 'ceylon-track-admin'", [email]);
        }

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (user.status === 'pending') {
            return res.status(403).json({ error: 'Your registration is pending admin approval.' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Your account has been suspended. Contact admin.' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = buildJWT(user);
        return res.status(200).json({ token, user: buildUserResponse(user) });
    } catch (error) {
        next(error);
    }
});

// GET /me
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, email, first_name, last_name, role, sub_role, home_station_id, status, theme_preference, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ user: buildUserResponse(result.rows[0]) });
    } catch (error) {
        next(error);
    }
});

// POST /logout — invalidate token by adding to blacklist
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader.split(' ')[1];
        await pool.query(
            'INSERT INTO token_blacklist (token_hash, user_id) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING',
            [hashToken(token), req.user.userId]
        );
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
});

// Admin: GET /staff - list all staff
router.get('/staff', authenticate, authorize(['ceylon-track-admin', 'admin']), async (req, res, next) => {
    try {
        const result = await pool.query(
            "SELECT id, email, first_name, last_name, role, sub_role, employee_id, status, created_at FROM users WHERE role IN ('staff') OR (role IN ('ceylon-track-admin', 'admin') AND id != $1) ORDER BY created_at DESC",
            [req.user.userId]
        );
        const staff = result.rows.map(u => ({
            id: u.id, email: u.email, name: (u.first_name || '') + ' ' + (u.last_name || ''),
            role: u.role, sub_role: u.sub_role, employee_id: u.employee_id,
            status: u.status, created_at: u.created_at
        }));
        res.json({ staff });
    } catch (err) { next(err); }
});

// Admin: PUT /staff/:id/status - approve/reject/suspend
router.put('/staff/:id/status', authenticate, authorize(['ceylon-track-admin', 'admin']), async (req, res, next) => {
    try {
        const { status, rejection_reason } = req.body;
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Status must be active or suspended' });
        }
        const result = await pool.query(
            'UPDATE users SET status = $1, approved_by = $2, approved_at = NOW(), rejection_reason = $3 WHERE id = $4 AND role = $5 RETURNING id, email, status',
            [status, req.user.userId, rejection_reason || null, req.params.id, 'staff']
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) { next(err); }
});

module.exports = router;
