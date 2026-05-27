const request = require('supertest');
const { app } = require('../index');

describe('JourneyWatch API', () => {
    const unique = () => `jw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    async function registerToken(role) {
        if (role === 'passenger') {
            const email = `${unique()}@example.com`;
            const res = await request(app).post('/api/auth/register').send({
                first_name: 'Watch', last_name: 'Tester', email,
                password: 'watchtest1', role: 'passenger',
            });
            return res.body.token;
        }
        return null;
    }

    test('Test 1 — GET /api/journeywatch without token returns 401', async () => {
        const res = await request(app).get('/api/journeywatch');
        expect(res.status).toBe(401);
    });

    test('Test 2 — GET /api/journeywatch with passenger token returns 200', async () => {
        const token = await registerToken('passenger');
        const res = await request(app)
            .get('/api/journeywatch')
            .set('Authorization', 'Bearer ' + token);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
