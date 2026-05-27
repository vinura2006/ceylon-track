const request = require('supertest');
const { app } = require('../index');

let paxToken = null;

beforeAll(async () => {
    const email = 'theme_test_' + Date.now() + '@test.lk';
    const reg = await request(app)
        .post('/api/auth/register')
        .send({ first_name: 'Theme', last_name: 'Test', email, password: 'Test@123456', role: 'passenger' });
    if (reg.body.token) paxToken = reg.body.token;
});

describe('Theme API', () => {
    test('PUT /api/users/theme requires auth', async () => {
        const res = await request(app)
            .put('/api/users/theme')
            .send({ theme: 'sunset' });
        expect(res.status).toBe(401);
    });

    test('PUT /api/users/theme saves valid theme', async () => {
        if (!paxToken) return;
        const res = await request(app)
            .put('/api/users/theme')
            .set('Authorization', 'Bearer ' + paxToken)
            .send({ theme: 'sunset' });
        expect(res.status).toBe(200);
        expect(res.body.theme).toBe('sunset');
    });

    test('PUT /api/users/theme rejects invalid theme', async () => {
        if (!paxToken) return;
        const res = await request(app)
            .put('/api/users/theme')
            .set('Authorization', 'Bearer ' + paxToken)
            .send({ theme: 'invalid-theme' });
        expect(res.status).toBe(400);
    });

    test('GET /api/auth/me returns theme_preference', async () => {
        if (!paxToken) return;
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer ' + paxToken);
        expect(res.status).toBe(200);
        expect(res.body.user.theme_preference).toBeDefined();
    });
});
