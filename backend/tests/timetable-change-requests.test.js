const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Timetable Change Requests API', () => {
    const unique = () => `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let adminToken = null;
    let staffToken = null;
    let staffId = null;

    async function createStaffAndGetToken(extra) {
        const email = `${unique()}@example.com`;
        const empId = 'EMP-' + unique();
        await request(app).post('/api/auth/register').send({
            first_name: 'Staff', last_name: 'CRTest', email,
            password: 'staffuser123', role: 'staff',
            employee_id: empId, staff_access_code: 'SLR-STAFF-2026',
            sub_role: 'staff',
            ...(extra || {})
        });
        
        // Find the user ID
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        const userId = userRes.rows[0].id;
        
        await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [email]);
        
        const login = await request(app).post('/api/auth/login')
            .send({ login_type: 'staff', employee_id: empId, password: 'staffuser123' });
            
        return { token: login.body.token, userId };
    }

    beforeAll(async () => {
        // Admin token
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ login_type: 'admin', email: 'admin@ceylon.lk', password: 'Admin123!' });
        if (adminLogin.body.token) adminToken = adminLogin.body.token;

        // Staff token
        const staffData = await createStaffAndGetToken();
        staffToken = staffData.token;
        staffId = staffData.userId;
    });

    test('POST /api/timetable/change-request submits change request', async () => {
        const res = await request(app)
            .post('/api/timetable/change-request')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                change_type: 'add',
                proposed_train_no: 'T' + Math.random().toString(36).slice(2, 7).toUpperCase(),
                proposed_train_name: 'Proposed Express',
                proposed_route_name: 'Main Line',
                proposed_start_station_id: 1,
                proposed_end_station_id: 2,
                proposed_departure_time: '08:00:00',
                proposed_arrival_time: '10:00:00',
                reason: 'To handle extra rush'
            });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        // Cleanup
        await pool.query('DELETE FROM timetable_change_requests WHERE requested_by = $1', [staffId]);
    });

    test('POST /api/timetable/change-request with invalid change_type returns 400', async () => {
        const res = await request(app)
            .post('/api/timetable/change-request')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                change_type: 'invalid_type',
                proposed_train_no: '8888',
                reason: 'Just testing'
            });
        expect(res.status).toBe(400);
    });

    test('GET /api/timetable/change-requests returns all requests for admin', async () => {
        // Create a request first
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        await pool.query(
            `INSERT INTO timetable_change_requests (requested_by, change_type, proposed_train_no, status) 
             VALUES ($1, 'add', $2, 'pending')`,
            [staffId, train_no]
        );

        const res = await request(app)
            .get('/api/timetable/change-requests')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.requests).toBeDefined();
        expect(Array.isArray(res.body.requests)).toBe(true);
        expect(res.body.requests.length).toBeGreaterThan(0);

        // Cleanup
        await pool.query('DELETE FROM timetable_change_requests WHERE requested_by = $1', [staffId]);
    });

    test('GET /api/timetable/my-change-requests returns staff member\'s own requests', async () => {
        // Create a request first
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        await pool.query(
            `INSERT INTO timetable_change_requests (requested_by, change_type, proposed_train_no, status) 
             VALUES ($1, 'add', $2, 'pending')`,
            [staffId, train_no]
        );

        const res = await request(app)
            .get('/api/timetable/my-change-requests')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
        expect(res.body.requests).toBeDefined();
        expect(Array.isArray(res.body.requests)).toBe(true);

        // Cleanup
        await pool.query('DELETE FROM timetable_change_requests WHERE requested_by = $1', [staffId]);
    });

    test('PUT /api/timetable/change-requests/:id handles approve/reject workflow', async () => {
        // Create a request first
        const train_no = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const insert = await pool.query(
            `INSERT INTO timetable_change_requests (requested_by, change_type, proposed_train_no, proposed_train_name, status) 
             VALUES ($1, 'add', $2, 'Proposed Appr', 'pending') RETURNING id`,
            [staffId, train_no]
        );
        const crId = insert.rows[0].id;

        const res = await request(app)
            .put(`/api/timetable/change-requests/${crId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                status: 'approved',
                review_note: 'Approved by test suite'
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify it was updated in the DB
        const check = await pool.query('SELECT status FROM timetable_change_requests WHERE id = $1', [crId]);
        expect(check.rows[0].status).toBe('approved');

        // Cleanup both timetable entry and change request
        await pool.query('DELETE FROM sri_lanka_timetable WHERE train_no = $1', [train_no]);
        await pool.query('DELETE FROM timetable_change_requests WHERE id = $1', [crId]);
    });
});
