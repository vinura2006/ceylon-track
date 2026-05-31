const request = require('supertest');
const { app } = require('../index');

describe('Auth API', () => {
    const unique = () => `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    test('Test 1 — Register with valid data: POST /api/auth/register returns 201 and token', async () => {
        const email = `${unique()}@example.com`;
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                first_name: 'Test', last_name: 'User',
                email, password: 'secret12', role: 'passenger',
            });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
    });

    test('Test 2 — Register with duplicate email returns 409', async () => {
        const email = `${unique()}@example.com`;
        const body = { first_name: 'Dup', last_name: 'One', email, password: 'secret12', role: 'passenger' };
        const first = await request(app).post('/api/auth/register').send(body);
        expect(first.status).toBe(201);

        const second = await request(app).post('/api/auth/register').send(body);
        expect(second.status).toBe(409);
    });

    test('Test 3 — Login with correct password returns 200 and JWT', async () => {
        const email = `${unique()}@example.com`;
        const password = 'correctpass1';
        await request(app).post('/api/auth/register').send({
            first_name: 'Login', last_name: 'User', email, password, role: 'passenger',
        });

        const res = await request(app).post('/api/auth/login').send({ email, password, login_type: 'passenger' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    test('Test 4 — Login with wrong password returns 401', async () => {
        const email = `${unique()}@example.com`;
        await request(app).post('/api/auth/register').send({
            first_name: 'Wrong', last_name: 'Pass', email, password: 'rightpass1', role: 'passenger',
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'wrongpassword', login_type: 'passenger' });
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
        expect(res.status).toBe(401);
    });

    test('Test 7 — Password strength criteria blocks weak passwords when simulated in production', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production'; // simulate production environment
        try {
            const email = `${unique()}@example.com`;
            // 1. Weak password: too short
            const res1 = await request(app).post('/api/auth/register').send({
                first_name: 'Short', last_name: 'Pass', email, password: 'Ab1', role: 'passenger'
            });
            expect(res1.status).toBe(400);
            expect(res1.body.error).toContain('characters');

            // 2. Weak password: no uppercase
            const res2 = await request(app).post('/api/auth/register').send({
                first_name: 'NoUpper', last_name: 'Pass', email, password: 'password123!', role: 'passenger'
            });
            expect(res2.status).toBe(400);
            expect(res2.body.error).toContain('uppercase');

            // 3. Weak password: common password
            const res3 = await request(app).post('/api/auth/register').send({
                first_name: 'Common', last_name: 'Pass', email, password: 'Password123', role: 'passenger'
            });
            expect(res3.status).toBe(400);
            expect(res3.body.error).toContain('too common');
        } finally {
            process.env.NODE_ENV = originalNodeEnv; // restore env
        }
    });

    test('Test 8 — Lockout mechanism blocks login after 5 failed attempts', async () => {
        const email = `${unique()}@example.com`;
        const password = 'CorrectPassword1!';
        
        // Register the user
        await request(app).post('/api/auth/register').send({
            first_name: 'Lockout', last_name: 'User', email, password, role: 'passenger'
        });

        // 5 consecutive failed attempts
        for (let i = 0; i < 5; i++) {
            const res = await request(app).post('/api/auth/login').send({
                email, password: 'WrongPassword1!', login_type: 'passenger'
            });
            expect(res.status).toBe(401);
        }

        // 6th attempt (locked out, even if correct password!)
        const resLocked = await request(app).post('/api/auth/login').send({
            email, password, login_type: 'passenger'
        });
        expect(resLocked.status).toBe(423); // Locked
        expect(resLocked.body.error).toContain('locked');
    });
});
