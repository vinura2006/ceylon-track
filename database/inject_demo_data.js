const { Pool } = require('pg');
const path = require('path');
// Load .env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'ceylon_track',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

async function injectDemoData() {
  const today = new Date().toISOString().split('T')[0];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear today's GPS data (keep history)
    await client.query(
      'DELETE FROM trip_status_updates WHERE trip_date = $1', [today]
    );
    await client.query(
      'DELETE FROM train_last_stops WHERE trip_date = $1', [today]
    );

    // Insert today's trip statuses — mix of states for demo
    const statuses = [
      // schedule_id, status, delay, lat, lng, last_stop
      [1, 'DELAYED', 12, 7.1053, 80.3847, 'Polgahawela'],     // Train 1014 — between Polgahawela and Kandy
      [2, 'ON_TIME', 0,  6.5831, 80.0045, 'Aluthgama'],       // Train 1084 — near Aluthgama
      [3, 'DELAYED', 25, 6.0500, 80.2100, 'Galle'],            // Train 1086 — at Galle station
      [4, 'ON_TIME', 0,  7.8731, 80.6500, 'Hatton'],           // Train 1005 — near Hatton
      [5, 'CANCELLED', 0, null, null, 'Colombo Fort'],         // Train 1068 — cancelled at origin
      [6, 'ON_TIME', 0, 7.2200, 80.5900, 'Peradeniya Jct'],   // Train 1015 — near Peradeniya
      [7, 'DELAYED', 8, 6.3500, 80.1800, 'Ambalangoda'],       // Train 1083 — near Ambalangoda
      [8, 'ON_TIME', 0, 7.3000, 80.4100, 'Kurunegala'],        // Train 1022 — arrived Kurunegala
    ];

    for (const [sid, status, delay, lat, lng, lastStop] of statuses) {
      await client.query(`
        INSERT INTO trip_status_updates
          (schedule_id, trip_date, status, delay_minutes, current_lat, current_lng,
           last_stop_name, last_stop_time, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (schedule_id, trip_date)
        DO UPDATE SET
          status = EXCLUDED.status,
          delay_minutes = EXCLUDED.delay_minutes,
          current_lat = EXCLUDED.current_lat,
          current_lng = EXCLUDED.current_lng,
          last_stop_name = EXCLUDED.last_stop_name,
          last_stop_time = NOW(),
          updated_at = NOW()
      `, [sid, today, status, delay, lat, lng, lastStop]);
    }

    // Insert last stop records
    const lastStops = [
      [1, 'Polgahawela', today],
      [2, 'Aluthgama', today],
      [3, 'Galle', today],
      [4, 'Hatton', today],
      [6, 'Peradeniya Junction', today],
      [7, 'Ambalangoda', today],
      [8, 'Kurunegala', today],
    ];
    for (const [sid, station, date] of lastStops) {
      await client.query(`
        INSERT INTO train_last_stops
          (schedule_id, trip_date, station_name, arrived_at, update_type)
        VALUES ($1, $2, $3, NOW(), 'staff_input')
        ON CONFLICT (schedule_id, trip_date)
        DO UPDATE SET
          station_name = EXCLUDED.station_name,
          arrived_at = NOW()
      `, [sid, date, station]);
    }

    // Add historical data for reliability calculation (last 30 days)
    const historySQL = [];
    const scheduleIds = [1, 2, 3, 4, 5, 6, 7, 8];
    for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split('T')[0];
      for (const sid of scheduleIds) {
        const rand = Math.random();
        let status, delay;

        if (sid === 1 || sid === 5 || sid === 6) {
          // High Reliability (Green Badge): 90% ON_TIME, 8% DELAYED, 2% CANCELLED
          if (rand < 0.90) { status = 'ON_TIME'; delay = 0; }
          else if (rand < 0.98) { status = 'DELAYED'; delay = Math.floor(Math.random() * 15) + 5; }
          else { status = 'CANCELLED'; delay = 0; }
        } else if (sid === 2 || sid === 4 || sid === 8) {
          // Moderate Reliability (Orange Badge): 65% ON_TIME, 30% DELAYED, 5% CANCELLED
          if (rand < 0.65) { status = 'ON_TIME'; delay = 0; }
          else if (rand < 0.95) { status = 'DELAYED'; delay = Math.floor(Math.random() * 35) + 10; }
          else { status = 'CANCELLED'; delay = 0; }
        } else {
          // Poor Reliability (Red Badge): 35% ON_TIME, 55% DELAYED, 10% CANCELLED
          if (rand < 0.35) { status = 'ON_TIME'; delay = 0; }
          else if (rand < 0.90) { status = 'DELAYED'; delay = Math.floor(Math.random() * 60) + 15; }
          else { status = 'CANCELLED'; delay = 0; }
        }

        historySQL.push(
          client.query(`
            INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
          `, [sid, dateStr, status, delay])
        );
      }
    }
    await Promise.all(historySQL);

    await client.query('COMMIT');
    console.log('Demo data injected successfully!');
    console.log('Train 1014: DELAYED +12 min near Polgahawela');
    console.log('Train 1084: ON TIME near Aluthgama');
    console.log('Train 1086: DELAYED +25 min at Galle');
    console.log('Train 1068: CANCELLED (for disruptions demo)');
    console.log('30 days of history injected for reliability badges');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

injectDemoData();
