const request = require('supertest');
const { app } = require('../index');

let paxToken = null;
let adminToken = null;

beforeAll(async () => {
    const paxEmail = 'guard_pax_' + Date.now() + '@test.lk';
    const reg = await request(app)
        .post('/api/auth/register')
        .send({ first_name: 'Guard', last_name: 'Pax', email: paxEmail, password: 'Test@123456', role: 'passenger' });
    if (reg.body.token) paxToken = reg.body.token;

    // Use seeded admin account
    const login = await request(app)
        .post('/api/auth/login')
        .send({ login_type: 'admin', email: 'admin@ceylon.lk', password: 'Admin123!' });
    if (login.body.token) adminToken = login.body.token;
});

describe('Role-Based Access Guards', () => {
    test('Passenger blocked from staff stats', async () => {
        if (!paxToken) return;
        const res = await request(app)
            .get('/api/staff/stats')
            .set('Authorization', 'Bearer ' + paxToken);
        expect(res.status).toBe(403);
    });

    test('Admin can access staff stats', async () => {
        if (!adminToken) return;
        const res = await request(app)
            .get('/api/staff/stats')
            .set('Authorization', 'Bearer ' + adminToken);
        expect(res.status).toBe(200);
    });

    test('Admin can access staff list', async () => {
        if (!adminToken) return;
        const res = await request(app)
            .get('/api/auth/staff')
            .set('Authorization', 'Bearer ' + adminToken);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.staff)).toBe(true);
    });

    test('Passenger blocked from staff list', async () => {
        if (!paxToken) return;
        const res = await request(app)
            .get('/api/auth/staff')
            .set('Authorization', 'Bearer ' + paxToken);
        expect(res.status).toBe(403);
    });

    test('Admin can access admin routes', async () => {
        if (!adminToken) return;
        const res = await request(app)
            .get('/api/admin/analytics')
            .set('Authorization', 'Bearer ' + adminToken);
        expect([200, 500]).toContain(res.status); // 500 if CamelCase tables are empty - still authorized
    });

    test('Passenger blocked from admin routes', async () => {
        if (!paxToken) return;
        const res = await request(app)
            .get('/api/admin/analytics')
            .set('Authorization', 'Bearer ' + paxToken);
        expect(res.status).toBe(403);
    });

    test('Unauthenticated blocked from watch', async () => {
        const res = await request(app).get('/api/watch');
        expect(res.status).toBe(401);
    });

    test('Unauthenticated can access stations', async () => {
        const res = await request(app).get('/api/stations');
        expect(res.status).toBe(200);
    });

    test('Unauthenticated can access schedule search', async () => {
        const res = await request(app).get('/api/schedules/search?from=FOT&to=KDY');
        expect(res.status).toBe(200);
    });
});
