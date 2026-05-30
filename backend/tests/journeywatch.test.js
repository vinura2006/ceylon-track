const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('JourneyWatch API', () => {
    const unique = () => `jw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let passengerToken = null;
    let passengerId = null;
    let otherPassengerToken = null;
    let otherPassengerId = null;
    
    let trainId = 9991;
    let routeId = 9991;
    let scheduleId = 9991;
    let station1Id = 1; // Colombo Fort (seeded)
    let station2Id = 2; // Kandy (seeded)

    async function registerTokenAndCreateUser() {
        const email = `${unique()}@example.com`;
        const res = await request(app).post('/api/auth/register').send({
            first_name: 'Watch', last_name: 'Tester', email,
            password: 'watchtest123', role: 'passenger',
        });
        const token = res.body.token;

        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userRes.rows[0];

        const role = user.role === 'passenger' ? 'Passenger' : (user.role === 'staff' ? 'Staff' : 'Admin');
        // Insert/sync into "User" table
        await pool.query(
            `INSERT INTO "User" (id, email, password_hash, first_name, last_name, role) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id`,
            [user.id, user.email, user.password_hash, user.first_name, user.last_name, role]
        );

        return { token, userId: user.id };
    }

    beforeAll(async () => {
        const pax = await registerTokenAndCreateUser();
        passengerToken = pax.token;
        passengerId = pax.userId;

        const other = await registerTokenAndCreateUser();
        otherPassengerToken = other.token;
        otherPassengerId = other.userId;

        // Clean up any conflict records in lowercase tables
        await pool.query('DELETE FROM schedulestationtiming WHERE schedule_id = $1', [scheduleId]);
        await pool.query('DELETE FROM schedule WHERE id = $1', [scheduleId]);
        await pool.query('DELETE FROM train WHERE id = $1', [trainId]);
        await pool.query('DELETE FROM route WHERE id = $1', [routeId]);

        // Insert dynamic mock data for lowercase compatibility (with capacity constraint satisfied)
        await pool.query(`INSERT INTO train (id, name, number, type, capacity) VALUES ($1, 'Mock Express', $2, 'Express', 1000)`, [trainId, `TR-${unique().slice(0, 4)}`]);
        await pool.query(`INSERT INTO route (id, name, type) VALUES ($1, 'Colombo - Kandy', 'Express')`, [routeId]);
        await pool.query(`INSERT INTO schedule (id, train_id, route_id, effective_start_date, active) VALUES ($1, $2, $3, '2026-01-01', true)`, [scheduleId, trainId, routeId]);

        // Add timing entries (from and to stations)
        await pool.query(
            `INSERT INTO schedulestationtiming (schedule_id, station_id, arrival_time, departure_time, stop_sequence) 
             VALUES ($1, $2, '08:00:00', '08:05:00', 1)`,
            [scheduleId, station1Id]
        );
        await pool.query(
            `INSERT INTO schedulestationtiming (schedule_id, station_id, arrival_time, departure_time, stop_sequence) 
             VALUES ($1, $2, '10:00:00', '10:05:00', 2)`,
            [scheduleId, station2Id]
        );
    });

    afterAll(async () => {
        // Cleanup all mock data
        await pool.query('DELETE FROM journeywatch WHERE user_id = $1', [passengerId]);
        await pool.query('DELETE FROM schedulestationtiming WHERE schedule_id = $1', [scheduleId]);
        await pool.query('DELETE FROM schedule WHERE id = $1', [scheduleId]);
        await pool.query('DELETE FROM train WHERE id = $1', [trainId]);
        await pool.query('DELETE FROM route WHERE id = $1', [routeId]);
        await pool.query('DELETE FROM "User" WHERE id IN ($1, $2)', [passengerId, otherPassengerId]);
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [passengerId, otherPassengerId]);
    });

    test('Test 1 — GET /api/journeywatch without token returns 401', async () => {
        const res = await request(app).get('/api/journeywatch');
        expect(res.status).toBe(401);
    });

    test('Test 2 — GET /api/journeywatch with passenger token returns 200', async () => {
        const res = await request(app)
            .get('/api/journeywatch')
            .set('Authorization', 'Bearer ' + passengerToken);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('Test 3 — POST /api/journeywatch creates a new watch', async () => {
        const travel_date = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({
                train_id: trainId,
                travel_date
            });
        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Created');
        expect(res.body.id).toBeDefined();
    });

    test('Test 4 — POST /api/journeywatch duplicate watch returns 409', async () => {
        const travel_date = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({
                train_id: trainId,
                travel_date
            });
        expect(res.status).toBe(409);
        expect(res.body.message).toBe('Already watching this train');
    });

    test('Test 5 — GET /api/journeywatch/check returns watch state', async () => {
        const res = await request(app)
            .get(`/api/journeywatch/check?train_id=${trainId}`)
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.watched).toBe(true);
    });

    test('Test 6 — PATCH /api/journeywatch/:id/notifications updates notification preferences', async () => {
        // Get the watch ID first
        const watchRes = await pool.query('SELECT id FROM journeywatch WHERE user_id = $1', [passengerId]);
        const watchId = watchRes.rows[0].id;

        const res = await request(app)
            .patch(`/api/journeywatch/${watchId}/notifications`)
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({
                notify_delays: false,
                notify_departure: false,
                notify_cancellations: false
            });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Notification preferences updated');
    });

    test('Test 7 — DELETE /api/journeywatch/:id removes journey watch', async () => {
        // Get the watch ID first
        const watchRes = await pool.query('SELECT id FROM journeywatch WHERE user_id = $1', [passengerId]);
        const watchId = watchRes.rows[0].id;

        const res = await request(app)
            .delete(`/api/journeywatch/${watchId}`)
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Deleted successfully');
    });
});
