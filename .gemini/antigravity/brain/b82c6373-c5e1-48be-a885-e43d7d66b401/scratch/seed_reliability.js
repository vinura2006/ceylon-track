const pool = require('../../backend/db/pool');
const { refreshReliabilityCache } = require('../../backend/jobs/reliabilityRefresh');

async function seed() {
    console.log('Starting reliability seed for Kandy to Colombo route...');

    try {
        // 1. Delete existing mock schedules if any to allow re-runs
        await pool.query('DELETE FROM stop_times WHERE schedule_id IN (11, 12)');
        await pool.query('DELETE FROM trip_status_updates WHERE schedule_id IN (6, 11, 12)');
        await pool.query('DELETE FROM schedules WHERE id IN (11, 12)');

        // 2. Insert new Kandy -> Colombo Fort schedules
        console.log('Inserting schedules 11 (Kandy Express) and 12 (Kandy Mail)...');
        await pool.query(`
            INSERT INTO schedules 
                (id, train_number, train_name, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week) 
            VALUES
                (11, '1017', 'Kandy Express', 2, 1, '06:15:00', '09:00:00', '2nd', '{1,2,3,4,5,6,7}'),
                (12, '1019', 'Kandy Mail', 2, 1, '20:30:00', '23:45:00', 'mixed', '{1,2,3,4,5,6,7}')
        `);

        // 3. Insert stops for schedule 11
        console.log('Inserting stops for Kandy Express...');
        await pool.query(`
            INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence) VALUES
                (11, 2, 'Kandy', '06:15:00', 1),
                (11, 14, 'Peradeniya Junction', '06:30:00', 2),
                (11, 13, 'Polgahawela', '07:15:00', 3),
                (11, 12, 'Veyangoda', '08:00:00', 4),
                (11, 11, 'Ragama', '08:35:00', 5),
                (11, 1, 'Colombo Fort', '09:00:00', 6)
        `);

        // 4. Insert stops for schedule 12
        console.log('Inserting stops for Kandy Mail...');
        await pool.query(`
            INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence) VALUES
                (12, 2, 'Kandy', '20:30:00', 1),
                (12, 14, 'Peradeniya Junction', '20:45:00', 2),
                (12, 13, 'Polgahawela', '21:35:00', 3),
                (12, 12, 'Veyangoda', '22:30:00', 4),
                (12, 11, 'Ragama', '23:15:00', 5),
                (12, 1, 'Colombo Fort', '23:45:00', 6)
        `);

        // Adjust sequences
        await pool.query("SELECT setval('schedules_id_seq', 12)");

        // 5. Generate 30-day trip updates for schedule 6 (Intercity Return)
        // High reliability: ~93% (28 days on-time, 2 days delayed)
        console.log('Generating trip history for Intercity Return (High Reliability)...');
        for (let i = 0; i < 30; i++) {
            const isDelayed = (i === 4 || i === 18);
            const status = isDelayed ? 'DELAYED' : 'ON_TIME';
            const delay = isDelayed ? 12 : 0;
            await pool.query(
                'INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, updated_at) VALUES ($1, CURRENT_DATE - $2, $3, $4, NOW() - ($5 || \' days\')::INTERVAL)',
                [6, i, status, delay, i]
            );
        }

        // 6. Generate 30-day trip updates for schedule 11 (Kandy Express)
        // Medium reliability: ~70% (21 days on-time, 9 days delayed)
        console.log('Generating trip history for Kandy Express (Medium Reliability)...');
        for (let i = 0; i < 30; i++) {
            const isDelayed = (i % 3 === 0); // 10 days out of 30
            const status = isDelayed ? 'DELAYED' : 'ON_TIME';
            const delay = isDelayed ? (12 + (i % 10)) : 0;
            await pool.query(
                'INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, updated_at) VALUES ($1, CURRENT_DATE - $2, $3, $4, NOW() - ($5 || \' days\')::INTERVAL)',
                [11, i, status, delay, i]
            );
        }

        // 7. Generate 30-day trip updates for schedule 12 (Kandy Mail)
        // Low reliability: ~26% (8 days on-time, 22 days delayed)
        console.log('Generating trip history for Kandy Mail (Low Reliability)...');
        for (let i = 0; i < 30; i++) {
            const isDelayed = (i % 4 !== 0); // 22 or 23 days out of 30
            const status = isDelayed ? 'DELAYED' : 'ON_TIME';
            const delay = isDelayed ? (35 + (i % 35)) : 0;
            await pool.query(
                'INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, updated_at) VALUES ($1, CURRENT_DATE - $2, $3, $4, NOW() - ($5 || \' days\')::INTERVAL)',
                [12, i, status, delay, i]
            );
        }

        // 8. Refresh the reliability cache
        console.log('Refreshing schedule reliability cache...');
        await refreshReliabilityCache();

        console.log('✅ Seeding completed successfully! Badges generated.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
