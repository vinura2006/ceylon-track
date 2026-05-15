const request = require('supertest');
const app = require('../index');

describe('Auth API', () => {
    const unique = () => `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    test('Test 1 — Register with valid data: POST /api/auth/register returns 201 and token', async () => {
        const email = `${unique()}@example.com`;
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email,
                password: 'secret12',
                role: 'passenger',
            });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
    });

    test('Test 2 — Register with duplicate email returns 409', async () => {
        const email = `${unique()}@example.com`;
        const body = {
            name: 'Dup One',
            email,
            password: 'secret12',
            role: 'passenger',
        };
        const first = await request(app).post('/api/auth/register').send(body);
        expect(first.status).toBe(201);

        const second = await request(app).post('/api/auth/register').send(body);
        expect(second.status).toBe(409);
    });

    test('Test 3 — Login with correct password returns 200 and JWT', async () => {
        const email = `${unique()}@example.com`;
        const password = 'correctpass1';
        await request(app).post('/api/auth/register').send({
            name: 'Login User',
            email,
            password,
            role: 'passenger',
        });

        const res = await request(app).post('/api/auth/login').send({ email, password });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    test('Test 4 — Login with wrong password returns 401', async () => {
        const email = `${unique()}@example.com`;
        await request(app).post('/api/auth/register').send({
            name: 'Wrong Pass',
            email,
            password: 'rightpass1',
            role: 'passenger',
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'wrongpassword' });
        expect(res.status).toBe(401);
    });

    test('Test 5 — GET /api/journeywatch without token returns 401', async () => {
        const res = await request(app).get('/api/journeywatch');
        expect(res.status).toBe(401);
    });

    test('Test 6 — GET /api/journeywatch with invalid Bearer token returns 403', async () => {
        const res = await request(app)
            .get('/api/journeywatch')
            .set('Authorization', 'Bearer invalidtoken');
        expect(res.status).toBe(403);
    });
});
