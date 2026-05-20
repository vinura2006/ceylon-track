const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'ceylon_track',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkReliability() {
    try {
        const query = `
            SELECT 
                s.id,
                s.train_number,
                s.train_name,
                COUNT(*) as total_trips,
                COUNT(CASE WHEN u.status = 'ON_TIME' THEN 1 END) as on_time_trips,
                COUNT(CASE WHEN u.status = 'DELAYED' THEN 1 END) as delayed_trips,
                COUNT(CASE WHEN u.status = 'CANCELLED' THEN 1 END) as cancelled_trips,
                ROUND(COUNT(CASE WHEN u.status = 'ON_TIME' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100) as reliability_percent
            FROM schedules s
            JOIN trip_status_updates u ON s.id = u.schedule_id
            GROUP BY s.id, s.train_number, s.train_name
            ORDER BY s.id;
        `;
        
        const res = await pool.query(query);
        console.log('--- Train Reliability Statistics ---');
        res.rows.forEach(row => {
            let badge = '';
            const rel = Number(row.reliability_percent);
            if (rel >= 80) badge = '🟩 USUALLY_ON_TIME';
            else if (rel >= 50) badge = '🟧 SOMETIMES_DELAYED';
            else badge = '🟥 OFTEN_LATE';

            console.log(`Train ${row.train_number} (${row.train_name}):`);
            console.log(`  Total Trips: ${row.total_trips}`);
            console.log(`  On Time: ${row.on_time_trips} | Delayed: ${row.delayed_trips} | Cancelled: ${row.cancelled_trips}`);
            console.log(`  Reliability Score: ${row.reliability_percent}% -> Badge: ${badge}`);
            console.log();
        });
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkReliability();
