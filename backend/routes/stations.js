const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

/**
 * GET /api/stations
 * Returns all stations with their names and codes for autocomplete functionality
 * Used by frontend search form to populate station dropdown
 */
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                name,
                code,
                is_major
            FROM Station
            ORDER BY name ASC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            count: result.rows.length,
            stations: result.rows.map(row => ({
                id: row.id,
                name: row.name,
                code: row.code,
                is_major: row.is_major
            }))
        });
        
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({
            error: 'Internal server error while fetching stations'
        });
    }
});

module.exports = router;
