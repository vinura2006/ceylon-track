const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cache = require('../utils/simpleCache');

// GET / — list all stations (cached 5 minutes)
router.get('/', async (req, res, next) => {
    try {
        const cached = cache.get('stations_list');
        if (cached) return res.status(200).json(cached);

        const result = await pool.query(
            `SELECT id, name, code, 
             ST_Y(location::geometry) as lat, 
             ST_X(location::geometry) as lng, 
             created_at as "createdAt" 
             FROM stations ORDER BY name ASC`
        );
        const data = { stations: result.rows };
        cache.set('stations_list', data, 300); // 5 min TTL
        return res.status(200).json(data);
    } catch (error) {
        next(error);
    }
});

// POST / — create station (admin only); invalidates stations cache
router.post('/', authenticate, authorize(['admin']), async (req, res, next) => {
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

        cache.invalidate('stations_list'); // bust cache after mutation
        return res.status(201).json({ station: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
