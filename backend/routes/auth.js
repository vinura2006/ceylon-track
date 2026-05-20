const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, role, employee_id, staff_access_code } = req.body;

        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'All base fields are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const userRole = role === 'staff' ? 'staff' : 'passenger';
        let employeeId = null;

        if (userRole === 'staff') {
            if (!employee_id || !staff_access_code) {
                return res.status(400).json({ error: 'Employee ID and Staff Access Code are required for staff registration' });
            }
            if (staff_access_code !== 'SLR-STAFF-2026') {
                return res.status(403).json({ error: 'Invalid Staff Access Code' });
            }
            employeeId = employee_id;

            // Check if employee_id already exists
            const empCheck = await pool.query('SELECT id FROM users WHERE employee_id = $1', [employeeId]);
            if (empCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Employee ID already registered' });
            }
        }

        // Check if email already exists
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, role, employee_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role, employee_id',
            [email, passwordHash, first_name, last_name, userRole, employeeId]
        );

        const user = result.rows[0];

        // Sign JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password, login_type, employee_id } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const loginType = login_type === 'staff' ? 'staff' : 'passenger';
        let result;

        if (loginType === 'staff') {
            if (!employee_id) {
                return res.status(400).json({ error: 'Employee ID is required for staff login' });
            }
            result = await pool.query('SELECT * FROM users WHERE employee_id = $1 AND (role = $2 OR role = $3)', [employee_id, 'staff', 'admin']);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid Employee ID or password' });
            }
        } else {
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }
            // Find user by email
            result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
        }

        const user = result.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            const errField = loginType === 'staff' ? 'Employee ID' : 'email';
            return res.status(401).json({ error: `Invalid ${errField} or password` });
        }

        // Sign JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /me
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        return res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
