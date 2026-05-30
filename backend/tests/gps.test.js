const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('GPS API', () => {
    const unique = () => `gps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let staffToken = null;
    let staffId = null;
    let stationMasterToken = null;

    async function createStaffAndGetToken(subRole = 'driver') {
        const email = `${unique()}@example.com`;
        const empId = 'EMP-' + unique();
        await request(app).post('/api/auth/register').send({
            first_name: 'Staff', last_name: subRole, email,
            password: 'staffuser123', role: 'staff',
            employee_id: empId, staff_access_code: 'SLR-STAFF-2026',
            sub_role: subRole
        });
        
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        const userId = userRes.rows[0].id;
        
        await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [email]);
        
        const login = await request(app).post('/api/auth/login')
            .send({ login_type: 'staff', employee_id: empId, password: 'staffuser123' });
            
        return { token: login.body.token, userId };
    }

    beforeAll(async () => {
        const driverData = await createStaffAndGetToken('driver');
        staffToken = driverData.token;
        staffId = driverData.userId;

        const smData = await createStaffAndGetToken('station_master');
        stationMasterToken = smData.token;
    });

    afterEach(async () => {
        await pool.query('DELETE FROM train_assignments WHERE user_id = $1', [staffId]);
        await pool.query('DELETE FROM trip_status_updates WHERE schedule_id = 1 AND trip_date = CURRENT_DATE');
    });

    test('GET /api/gps/all-active returns active trains', async () => {
        const res = await request(app).get('/api/gps/all-active');
        expect(res.status).toBe(200);
        expect(res.body.trains).toBeDefined();
        expect(Array.isArray(res.body.trains)).toBe(true);
    });

    test('GET /api/gps/:scheduleId returns 404 when no data', async () => {
        const res = await request(app).get('/api/gps/999');
        expect(res.status).toBe(404);
    });

    test('POST /api/gps/mobile-update fails without active assignment/session', async () => {
        const res = await request(app)
            .post('/api/gps/mobile-update')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                schedule_id: 1,
                lat: 6.9,
                lng: 79.8
            });
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('No active assignment or session found');
    });

    test('POST /api/gps/mobile-update works when assignment is active', async () => {
        // Create an assignment first
        await pool.query(
            `INSERT INTO train_assignments (user_id, schedule_id, is_active) VALUES ($1, 1, true)`,
            [staffId]
        );

        const res = await request(app)
            .post('/api/gps/mobile-update')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                schedule_id: 1,
                lat: 6.9344,
                lng: 79.8477,
                accuracy: 10,
                heading: 90,
                speed: 15
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.lat).toBe(6.9344);
        expect(res.body.lng).toBe(79.8477);
    });

    test('POST /api/gps/mobile-update rejects station masters', async () => {
        const res = await request(app)
            .post('/api/gps/mobile-update')
            .set('Authorization', `Bearer ${stationMasterToken}`)
            .send({
                schedule_id: 1,
                lat: 6.9344,
                lng: 79.8477
            });
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Station masters cannot broadcast GPS location');
    });

    test('POST /api/gps/mobile-update validates Sri Lankan bounds', async () => {
        // Create assignment
        await pool.query(
            `INSERT INTO train_assignments (user_id, schedule_id, is_active) VALUES ($1, 1, true)`,
            [staffId]
        );

        const res = await request(app)
            .post('/api/gps/mobile-update')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                schedule_id: 1,
                lat: 0.0,
                lng: 0.0
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid coordinates');
    });

    test('POST /api/gps/update updates GPS using x-gps-token (hardware update)', async () => {
        const res = await request(app)
            .post('/api/gps/update')
            .set('x-gps-token', process.env.GPS_DEVICE_TOKEN || 'jest-gps-device-token')
            .send({
                schedule_id: 1,
                lat: 6.9344,
                lng: 79.8477,
                status: 'ON_TIME',
                delay_minutes: 0
            });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('GPS updated');
        expect(res.body.lat).toBe(6.9344);
    });

    test('POST /api/gps/update returns 401 with invalid GPS token', async () => {
        const res = await request(app)
            .post('/api/gps/update')
            .set('x-gps-token', 'invalid-device-token')
            .send({
                schedule_id: 1,
                lat: 6.9344,
                lng: 79.8477
            });
        expect(res.status).toBe(401);
    });
});
