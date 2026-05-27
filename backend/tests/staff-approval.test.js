const request = require('supertest');
const { app } = require('../index');

describe('Staff Approval Workflow', () => {
    const empId = 'EMP-' + Date.now();
    let staffEmail = 'approval_staff_' + Date.now() + '@test.lk';

    afterAll(async () => {
        const pool = require('../db/pool');
        await pool.query("DELETE FROM users WHERE employee_id = $1", [empId]);
        await pool.query("DELETE FROM users WHERE email = $1", [staffEmail]);
    });

    test('Staff signup creates pending account', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                first_name: 'Test', last_name: 'Staff',
                email: staffEmail, password: 'Test@123456',
                role: 'staff', employee_id: empId,
                staff_access_code: 'SLR-STAFF-2026', sub_role: 'staff'
            });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending');
        expect(res.body.message).toContain('pending');
        expect(res.body.token).toBeUndefined();
    });

    test('Pending staff cannot login', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ login_type: 'staff', employee_id: empId, password: 'Test@123456' });
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('pending');
    });

    test('Duplicate employee_id rejected', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                first_name: 'Test2', last_name: 'Staff2',
                email: 'another_' + Date.now() + '@test.lk', password: 'Test@123456',
                role: 'staff', employee_id: empId,
                staff_access_code: 'SLR-STAFF-2026', sub_role: 'staff'
            });
        expect(res.status).toBe(409);
    });

    test('Staff signup with wrong access code rejected', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                first_name: 'Bad', last_name: 'Staff',
                email: 'bad_code_' + Date.now() + '@test.lk', password: 'Test@123456',
                role: 'staff', employee_id: 'EMP-BAD-' + Date.now(),
                staff_access_code: 'WRONG-CODE', sub_role: 'staff'
            });
        expect(res.status).toBe(403);
    });

    test('Passenger signup is immediate (active)', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                first_name: 'Pax', last_name: 'Test',
                email: 'pax_' + Date.now() + '@test.lk', password: 'Test@123456',
                role: 'passenger'
            });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.status).toBe('active');
    });
});
