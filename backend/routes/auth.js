const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ceylon_track_secret_key_2024';
const SALT_ROUNDS = 10;

// GET /api/auth - Show available auth endpoints
router.get('/', (req, res) => {
    res.json({
        message: 'Authentication endpoints',
        endpoints: {
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            profile: 'GET /api/auth/me'
        }
    });
});

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone, role } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long' 
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM "User" WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ 
                error: 'User with this email already exists' 
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert new user
        const result = await pool.query(
            `INSERT INTO "User" (email, password_hash, first_name, last_name, phone, role) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, email, first_name, last_name, role, created_at`,
            [
                email, 
                passwordHash, 
                first_name || null, 
                last_name || null, 
                phone || null, 
                role || 'Passenger'
            ]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                created_at: user.created_at
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Internal server error during registration' 
        });
    }
});

// POST /api/auth/login - Authenticate user and return JWT
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }

        // Find user by email
        const result = await pool.query(
            `SELECT id, email, password_hash, first_name, last_name, role, active, email_verified 
             FROM "User" 
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.active) {
            return res.status(401).json({ 
                error: 'Account is deactivated. Please contact support.' 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }

        // Update last login timestamp
        await pool.query(
            'UPDATE "User" SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                email_verified: user.email_verified
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Internal server error during login' 
        });
    }
});

// GET /api/auth/me - Get current user profile (protected route)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, phone, role, 
                    email_verified, last_login, created_at 
             FROM "User" 
             WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Access token is required' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                error: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
}

module.exports = router;
