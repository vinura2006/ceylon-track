const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const pool = require('../db/pool');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../../database/sprint3_part2_updates.sql'), 'utf8');
        // The script has "train_name" and "train_number" but the columns in schema are "name" and "number"!
        // Wait, the user said: UPDATE Train SET train_name = ... WHERE train_id = ...
        // Let me check schema.sql to see actual column names.
        
        await pool.query(sql);
        console.log('Update successful');
        
        const res = await pool.query('SELECT id, name, number FROM Train ORDER BY id;');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
