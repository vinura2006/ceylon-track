const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Timetable API', () => {
    const unique = () => `time_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let adminToken = null;
    let passengerToken = null;

    beforeAll(async () => {
        // Authenticate admin using seeded account
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ login_type: 'admin', email: 'admin@ceylon.lk', password: 'Admin123!' });
        if (adminLogin.body.token) adminToken = adminLogin.body.token;

        // Register a new passenger dynamically
        const passengerEmail = `${unique()}@example.com`;
        const paxReg = await request(app).post('/api/auth/register').send({
            first_name: 'Pax', last_name: 'Time', email: passengerEmail, password: 'passenger123', role: 'passenger'
        });
        if (paxReg.body.token) passengerToken = paxReg.body.token;
    });

    test('GET /api/timetable returns all records', async () => {
        const res = await request(app).get('/api/timetable');
        expect(res.status).toBe(200);
        expect(res.body.timetable).toBeDefined();
        expect(Array.isArray(res.body.timetable)).toBe(true);
    });

    test('GET /api/timetable with route filter works', async () => {
        const res = await request(app).get('/api/timetable?route=Main');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.timetable)).toBe(true);
    });

    test('GET /api/timetable/routes returns distinct routes list', async () => {
        const res = await request(app).get('/api/timetable/routes');
        expect(res.status).toBe(200);
        expect(res.body.routes).toBeDefined();
        expect(Array.isArray(res.body.routes)).toBe(true);
    });

    test('GET /api/timetable/grouped returns timetables grouped by route', async () => {
        const res = await request(app).get('/api/timetable/grouped');
        expect(res.status).toBe(200);
        expect(res.body.groupedTimetables).toBeDefined();
        expect(typeof res.body.groupedTimetables).toBe('object');
    });

    test('GET /api/timetable/:id returns stops for a timetable entry', async () => {
        const res = await request(app).get('/api/timetable/1');
        expect(res.status).toBe(200);
        expect(res.body.stops).toBeDefined();
        expect(Array.isArray(res.body.stops)).toBe(true);
    });

    test('GET /api/timetable/:id with invalid ID returns 400', async () => {
        const res = await request(app).get('/api/timetable/invalid_id');
        expect(res.status).toBe(400);
    });

    test('POST /api/timetable fails for unauthorized users', async () => {
        const res = await request(app)
            .post('/api/timetable')
            .send({
                train_no: '8888', train_name: 'Unauthorized Express', route_name: 'Main Line',
                start_station_id: 1, end_station_id: 2
            });
        expect(res.status).toBe(401);
    });

    test('POST /api/timetable fails for passengers', async () => {
        const res = await request(app)
            .post('/api/timetable')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({
                train_no: '8888', train_name: 'Unauthorized Express', route_name: 'Main Line',
                start_station_id: 1, end_station_id: 2
            });
        expect(res.status).toBe(403);
    });

    test('POST /api/timetable creates an entry when request is from admin', async () => {
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const res = await request(app)
            .post('/api/timetable')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                train_no, train_name: 'Admin Express', route_name: 'Main Line',
                start_station_id: 1, end_station_id: 2, departure_time: '10:00:00', arrival_time: '12:00:00'
            });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.id).toBeDefined();

        // Cleanup
        await pool.query('DELETE FROM sri_lanka_timetable WHERE id = $1', [res.body.id]);
    });

    test('POST /api/timetable duplicate train_no returns 409', async () => {
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const first = await request(app)
            .post('/api/timetable')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                train_no, train_name: 'Admin Express', route_name: 'Main Line',
                start_station_id: 1, end_station_id: 2, departure_time: '10:00:00', arrival_time: '12:00:00'
            });
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/timetable')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                train_no, train_name: 'Admin Express Duplicate', route_name: 'Main Line',
                start_station_id: 1, end_station_id: 2, departure_time: '10:00:00', arrival_time: '12:00:00'
            });
        expect(second.status).toBe(409);

        // Cleanup
        await pool.query('DELETE FROM sri_lanka_timetable WHERE id = $1', [first.body.id]);
    });

    test('PUT /api/timetable/:id updates entry', async () => {
        // Create an entry first
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const insert = await pool.query(
            `INSERT INTO sri_lanka_timetable (train_no, train_name, route_name, start_station_id, end_station_id) 
             VALUES ($1, 'Before', 'Main', 1, 2) RETURNING id`,
            [train_no]
        );
        const id = insert.rows[0].id;

        const res = await request(app)
            .put(`/api/timetable/${id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                train_no, train_name: 'After', route_name: 'Main Line',
                start_station_id: 1, end_station_id: 2, departure_time: '10:00:00', arrival_time: '12:00:00'
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Cleanup
        await pool.query('DELETE FROM sri_lanka_timetable WHERE id = $1', [id]);
    });

    test('DELETE /api/timetable/:id deletes entry', async () => {
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const insert = await pool.query(
            `INSERT INTO sri_lanka_timetable (train_no, train_name, route_name, start_station_id, end_station_id) 
             VALUES ($1, 'ToDelete', 'Main', 1, 2) RETURNING id`,
            [train_no]
        );
        const id = insert.rows[0].id;

        const res = await request(app)
            .delete(`/api/timetable/${id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('POST /api/timetable/book/:id logs ticket booking redirect', async () => {
        const res = await request(app)
            .post('/api/timetable/book/1')
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.bookingId).toBeDefined();

        // Cleanup
        await pool.query('DELETE FROM ticket_bookings WHERE id = $1', [res.body.bookingId]);
    });

    test('POST /api/timetable/:id/stops updates intermediate stops', async () => {
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const insert = await pool.query(
            `INSERT INTO sri_lanka_timetable (train_no, train_name, route_name, start_station_id, end_station_id) 
             VALUES ($1, 'StopsTest', 'Main', 1, 2) RETURNING id`,
            [train_no]
        );
        const id = insert.rows[0].id;

        const res = await request(app)
            .post(`/api/timetable/${id}/stops`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                stops: [
                    { station_id: 11, arrival_time: '10:15:00', departure_time: '10:17:00', stop_sequence: 1 },
                    { station_id: 12, arrival_time: '10:30:00', departure_time: '10:32:00', stop_sequence: 2 }
                ]
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Cleanup
        await pool.query('DELETE FROM timetable_stops WHERE timetable_id = $1', [id]);
        await pool.query('DELETE FROM sri_lanka_timetable WHERE id = $1', [id]);
    });
});
