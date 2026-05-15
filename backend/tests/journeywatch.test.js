const request = require('supertest');
const app = require('../index');

describe('JourneyWatch API', () => {
    const unique = () => `jw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const today = () => new Date().toISOString().split('T')[0];

    async function registerToken(role = 'passenger') {
        const email = `${unique()}@example.com`;
        const res = await request(app).post('/api/auth/register').send({
            name: 'Watch Tester',
            email,
            password: 'watchtest1',
            role,
        });
        expect(res.status).toBe(201);
        return { token: res.body.token, email };
    }

    test('Test 1 — POST /api/journeywatch with valid JWT and train_id 1 returns 201', async () => {
        const { token } = await registerToken();
        const res = await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${token}`)
            .send({ train_id: 1, travel_date: today() });
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
    });

    test('Test 2 — POST same train twice returns 409 on second request', async () => {
        const { token } = await registerToken();
        const body = { train_id: 1, travel_date: today() };
        const first = await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${token}`)
            .send(body);
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${token}`)
            .send(body);
        expect(second.status).toBe(409);
    });

    test('Test 3 — GET /api/journeywatch returns 200 and includes watched train', async () => {
        const { token } = await registerToken();
        await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${token}`)
            .send({ train_id: 1, travel_date: today() });

        const res = await request(app)
            .get('/api/journeywatch')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const ids = res.body.map((w) => w.train_id);
        expect(ids).toContain(1);
    });

    test('Test 4 — DELETE own watch entry returns 200', async () => {
        const { token } = await registerToken();
        const created = await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${token}`)
            .send({ train_id: 1, travel_date: today() });
        expect(created.status).toBe(201);
        const watchId = created.body.id;

        const res = await request(app)
            .delete(`/api/journeywatch/${watchId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    test('Test 5 — DELETE another user watch entry returns 403', async () => {
        const userA = await registerToken();
        const userB = await registerToken();

        const created = await request(app)
            .post('/api/journeywatch')
            .set('Authorization', `Bearer ${userA.token}`)
            .send({ train_id: 1, travel_date: today() });
        expect(created.status).toBe(201);
        const watchId = created.body.id;

        const res = await request(app)
            .delete(`/api/journeywatch/${watchId}`)
            .set('Authorization', `Bearer ${userB.token}`);
        expect(res.status).toBe(403);

        await request(app)
            .delete(`/api/journeywatch/${watchId}`)
            .set('Authorization', `Bearer ${userA.token}`);
    });
});
