const request = require('supertest');
const { app } = require('../index');

let staffToken = null;
let passengerToken = null;
let scheduleId = null;

beforeAll(async () => {
    const pool = require('../db/pool');

    // Get a schedule ID
    const sched = await pool.query('SELECT id FROM schedules LIMIT 1');
    if (sched.rows.length > 0) scheduleId = sched.rows[0].id;

    // Register staff
    const staffEmail = 'sessions_staff_' + Date.now() + '@test.lk';
    const res = await request(app)
        .post('/api/auth/register')
        .send({ first_name: 'Sess', last_name: 'Staff', email: staffEmail, password: 'Test@123456', role: 'staff', employee_id: 'EMP-SESS-' + Date.now(), staff_access_code: 'SLR-STAFF-2026', sub_role: 'staff' });
    // Staff is pending - need to approve via DB
    await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [staffEmail]);
    const login = await request(app)
        .post('/api/auth/login')
        .send({ login_type: 'staff', employee_id: 'EMP-SESS-' + Date.now(), password: 'Test@123456' });
    if (login.body.token) staffToken = login.body.token;
});

afterAll(async () => {
    if (scheduleId) {
        try {
            await require('../db/pool').query('UPDATE live_train_sessions SET is_active = false WHERE schedule_id = $1', [scheduleId]);
        } catch(e) {}
    }
});

describe('Sessions API', () => {
    test('POST /api/sessions/start requires auth', async () => {
        const res = await request(app)
            .post('/api/sessions/start')
            .send({ schedule_id: scheduleId });
        expect(res.status).toBe(401);
    });

    test('POST /api/sessions/start requires schedule_id', async () => {
        if (!staffToken) return;
        const res = await request(app)
            .post('/api/sessions/start')
            .set('Authorization', 'Bearer ' + staffToken)
            .send({});
        expect(res.status).toBe(400);
    });

    test('POST /api/sessions/start creates session', async () => {
        if (!staffToken || !scheduleId) return;
        const res = await request(app)
            .post('/api/sessions/start')
            .set('Authorization', 'Bearer ' + staffToken)
            .send({ schedule_id: scheduleId });
        expect(res.status).toBe(201);
        expect(res.body.session).toBeDefined();
    });

    test('POST /api/sessions/start blocks duplicate', async () => {
        if (!staffToken || !scheduleId) return;
        const res = await request(app)
            .post('/api/sessions/start')
            .set('Authorization', 'Bearer ' + staffToken)
            .send({ schedule_id: scheduleId });
        expect(res.status).toBe(409);
    });

    test('GET /api/sessions/my-active returns active session', async () => {
        if (!staffToken) return;
        const res = await request(app)
            .get('/api/sessions/my-active')
            .set('Authorization', 'Bearer ' + staffToken);
        expect(res.status).toBe(200);
        expect(res.body.session).toBeDefined();
    });

    test('GET /api/sessions/active is public', async () => {
        const res = await request(app).get('/api/sessions/active');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST /api/sessions/stop ends session', async () => {
        if (!staffToken) return;
        const res = await request(app)
            .post('/api/sessions/stop')
            .set('Authorization', 'Bearer ' + staffToken);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('POST /api/sessions/start after stop works', async () => {
        if (!staffToken || !scheduleId) return;
        const res = await request(app)
            .post('/api/sessions/start')
            .set('Authorization', 'Bearer ' + staffToken)
            .send({ schedule_id: scheduleId });
        expect(res.status).toBe(201);
        await request(app)
            .post('/api/sessions/stop')
            .set('Authorization', 'Bearer ' + staffToken);
    });
});
