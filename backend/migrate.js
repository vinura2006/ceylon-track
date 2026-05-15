const pool = require('./db/pool');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../database/sprint3_migration.sql'), 'utf8');
        await pool.query(sql);
        console.log('Migrations executed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

runMigrations();
