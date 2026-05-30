const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Train Assignments API', () => {
    const unique = () => `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let staffToken = null;
    let staffId = null;

    async function createStaffAndGetToken() {
        const email = `${unique()}@example.com`;
        const empId = 'EMP-' + unique();
        await request(app).post('/api/auth/register').send({
            first_name: 'Staff', last_name: 'AsgTest', email,
            password: 'staffuser123', role: 'staff',
            employee_id: empId, staff_access_code: 'SLR-STAFF-2026',
            sub_role: 'staff'
        });
        
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        const userId = userRes.rows[0].id;
        
        await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [email]);
        
        const login = await request(app).post('/api/auth/login')
            .send({ login_type: 'staff', employee_id: empId, password: 'staffuser123' });
            
        return { token: login.body.token, userId };
    }

    beforeAll(async () => {
        const staffData = await createStaffAndGetToken();
        staffToken = staffData.token;
        staffId = staffData.userId;
    });

    afterEach(async () => {
        // Deactivate assignments after each test to keep DB clean
        await pool.query('DELETE FROM train_assignments WHERE user_id = $1', [staffId]);
    });

    test('POST /api/assignments/start creates a new assignment', async () => {
        const res = await request(app)
            .post('/api/assignments/start')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ schedule_id: 1 });
        expect(res.status).toBe(200);
        expect(res.body.assignment).toBeDefined();
        expect(res.body.assignment.scheduleId).toBe(1);
    });

    test('POST /api/assignments/start with missing/invalid schedule_id returns 400', async () => {
        const res = await request(app)
            .post('/api/assignments/start')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({});
        expect(res.status).toBe(400);
    });

    test('GET /api/assignments/my-active returns current active assignment', async () => {
        // First start the assignment
        await request(app)
            .post('/api/assignments/start')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ schedule_id: 1 });

        const res = await request(app)
            .get('/api/assignments/my-active')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.assignment).toBeDefined();
        expect(res.body.assignment.scheduleId).toBe(1);
    });

    test('GET /api/assignments/my-active returns null if no active assignment', async () => {
        const res = await request(app)
            .get('/api/assignments/my-active')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.assignment).toBeNull();
    });

    test('POST /api/assignments/stop ends active assignment', async () => {
        // First start the assignment
        await request(app)
            .post('/api/assignments/start')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ schedule_id: 1 });

        const res = await request(app)
            .post('/api/assignments/stop')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Stopped broadcasting assignment');

        // Check DB that it's no longer active
        const check = await pool.query('SELECT is_active FROM train_assignments WHERE user_id = $1', [staffId]);
        expect(check.rows[0].is_active).toBe(false);
    });
});
