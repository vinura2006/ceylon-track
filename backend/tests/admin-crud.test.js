const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Admin CRUD and Analytics API', () => {
    const unique = () => `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let adminToken = null;
    let passengerToken = null;

    beforeAll(async () => {
        // Admin token using seeded account
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ login_type: 'admin', email: 'admin@ceylon.lk', password: 'Admin123!' });
        if (adminLogin.body.token) adminToken = adminLogin.body.token;

        // Passenger token
        const paxEmail = `${unique()}@example.com`;
        const paxRes = await request(app).post('/api/auth/register').send({
            first_name: 'Pax', last_name: 'AdminTest', email: paxEmail,
            password: 'passenger123', role: 'passenger'
        });
        passengerToken = paxRes.body.token;
    });

    test('GET /api/admin/analytics returns system stats for admins', async () => {
        const res = await request(app)
            .get('/api/admin/analytics')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.totalUsers).toBeDefined();
        expect(res.body.totalPassengers).toBeDefined();
        expect(res.body.activeStaff).toBeDefined();
        expect(res.body.activeSchedules).toBeDefined();
        expect(res.body.gpsActive).toBeDefined();
        expect(res.body.totalWatches).toBeDefined();
    });

    test('GET /api/admin/analytics blocks passengers (403)', async () => {
        const res = await request(app)
            .get('/api/admin/analytics')
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(res.status).toBe(403);
    });

    test('GET /api/admin/schedules returns list of schedules', async () => {
        const res = await request(app)
            .get('/api/admin/schedules')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.schedules).toBeDefined();
        expect(Array.isArray(res.body.schedules)).toBe(true);
    });

    test('DELETE /api/admin/schedules/:id deletes a schedule', async () => {
        // Create a temporary schedule first
        const train_number = `N_${unique().slice(0, 4)}`;
        const insert = await pool.query(
            `INSERT INTO schedules (train_number, train_name, from_station_id, to_station_id, departure_time, arrival_time)
             VALUES ($1, 'Temp Sched', 1, 2, '08:00:00', '10:00:00') RETURNING id`,
            [train_number]
        );
        const schedId = insert.rows[0].id;

        const res = await request(app)
            .delete(`/api/admin/schedules/${schedId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('DELETE /api/admin/stations/:id deletes a station', async () => {
        // Create a temporary station
        const code = 'S' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const insert = await pool.query(
            `INSERT INTO stations (name, code, location) 
             VALUES ('Temp Station', $1, ST_SetSRID(ST_MakePoint(79.8, 6.9), 4326)::geography) RETURNING id`,
            [code]
        );
        const stationId = insert.rows[0].id;

        const res = await request(app)
            .delete(`/api/admin/stations/${stationId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('DELETE /api/admin/stations/:id fails with 500 when active schedules reference it (FK constraint)', async () => {
        // Attempting to delete Colombo Fort (id = 1), which is referenced by schedules
        const res = await request(app)
            .delete('/api/admin/stations/1')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(500);
    });
});
