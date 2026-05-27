const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Staff / GPS admin API', () => {
    const unique = () => `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    async function createStaffAndGetToken(extra) {
        const email = `${unique()}@example.com`;
        const empId = 'EMP-' + unique();
        await request(app).post('/api/auth/register').send({
            first_name: 'Staff', last_name: 'Test', email,
            password: 'staffuser1', role: 'staff',
            employee_id: empId, staff_access_code: 'SLR-STAFF-2026',
            sub_role: 'staff',
            ...(extra || {})
        });
        await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [email]);
        const login = await request(app).post('/api/auth/login')
            .send({ login_type: 'staff', employee_id: empId, password: 'staffuser1' });
        return login.body.token;
    }

    async function createPassengerAndGetToken() {
        const email = `${unique()}@example.com`;
        const reg = await request(app).post('/api/auth/register').send({
            first_name: 'Pax', last_name: 'Test', email,
            password: 'passenger1', role: 'passenger',
        });
        return reg.body.token;
    }

    test('Test 1 — Update delay without token returns 401', async () => {
        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .send({ status: 'ON_TIME', delay_minutes: 5 });
        expect(res.status).toBe(401);
    });

    test('Test 2 — Update delay with passenger JWT returns 403', async () => {
        const token = await createPassengerAndGetToken();
        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .set('Authorization', 'Bearer ' + token)
            .send({ status: 'ON_TIME', delay_minutes: 5 });
        expect(res.status).toBe(403);
    });

    test('Test 3 — Staff can update train status', async () => {
        const token = await createStaffAndGetToken();
        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .set('Authorization', 'Bearer ' + token)
            .send({ status: 'ON_TIME', delay_minutes: 10 });
        expect(res.status).toBe(200);
    });

    test('Test 4 — Negative delay_minutes returns 400', async () => {
        const token = await createStaffAndGetToken();
        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .set('Authorization', 'Bearer ' + token)
            .send({ status: 'ON_TIME', delay_minutes: -5 });
        expect(res.status).toBe(400);
    });

    test('Test 5 — GPS update without token returns 401', async () => {
        const res = await request(app)
            .post('/api/gps/update')
            .send({ schedule_id: 1, lat: 6.93, lng: 79.85 });
        expect(res.status).toBe(401);
    });
});
