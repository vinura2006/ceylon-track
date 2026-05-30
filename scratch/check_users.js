const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ceylontrack',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
});

async function main() {
    try {
        console.log("Connecting to database...");
        const emails = ['passenger@ceylon.lk', 'staff@ceylon.lk', 'admin@ceylon.lk'];
        const res = await pool.query("SELECT id, email, role, status, password_hash FROM users WHERE email = ANY($1)", [emails]);
        console.log("Target Users in database:", res.rows);
    } catch (e) {
        console.error("Error querying database:", e);
    } finally {
        await pool.end();
    }
}

main();
