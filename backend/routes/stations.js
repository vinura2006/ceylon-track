const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// GET /
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, code, 
             ST_Y(location::geometry) as lat, 
             ST_X(location::geometry) as lng, 
             created_at as "createdAt" 
             FROM stations ORDER BY name ASC`
        );
        return res.status(200).json({ stations: result.rows });
    } catch (error) {
        console.error('List stations error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const { name, code, lat, lng } = req.body;

        if (!name || !code || lat === undefined || lng === undefined) {
            return res.status(400).json({ error: 'name, code, lat, and lng are required' });
        }

        const result = await pool.query(
            `INSERT INTO stations (name, code, location) 
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography) 
             RETURNING id, name, code, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng, created_at as "createdAt"`,
            [name, code, lat, lng]
        );

        return res.status(201).json({ station: result.rows[0] });
    } catch (error) {
        console.error('Create station error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
