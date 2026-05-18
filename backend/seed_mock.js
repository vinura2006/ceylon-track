require('dotenv').config({ path: './.env' });
const pool = require('./db/pool');

async function seedMockGps() {
    try {
        console.log('Seeding mock GPS data...');
        const scheduleQuery = `
            SELECT id, train_id FROM schedule WHERE train_id IN (1, 9, 6) AND active = TRUE
        `;
        const { rows } = await pool.query(scheduleQuery);
        
        let upsertQuery = `INSERT INTO tripstatusupdate (schedule_id, trip_date, current_lat, current_lng, delay_minutes, last_updated) VALUES `;
        const values = [];
        const params = [];
        let i = 1;

        const mockData = {
            1: { lat: 7.25624, lng: 80.51433, delay: 10 },
            9: { lat: 8.33380, lng: 80.39850, delay: 0 },
            6: { lat: 6.13965, lng: 80.10145, delay: 5 }
        };

        for (const row of rows) {
            const data = mockData[row.train_id];
            if (data) {
                values.push(`($${i++}, CURRENT_DATE, $${i++}, $${i++}, $${i++}, CURRENT_TIMESTAMP)`);
                params.push(row.id, data.lat, data.lng, data.delay);
            }
        }

        if (values.length > 0) {
            upsertQuery += values.join(', ');
            upsertQuery += ` ON CONFLICT (schedule_id, trip_date) DO UPDATE SET 
                current_lat = EXCLUDED.current_lat, 
                current_lng = EXCLUDED.current_lng, 
                last_updated = EXCLUDED.last_updated`;

            await pool.query(upsertQuery, params);
            console.log('Successfully seeded mock GPS data for active schedules.');
        } else {
            console.log('No active schedules found for trains 1, 9, and 6.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error seeding mock GPS data:', err);
        process.exit(1);
    }
}

seedMockGps();
