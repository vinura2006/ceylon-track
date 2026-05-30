const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Auth Logout and Blacklisting', () => {
    const unique = () => `logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let passengerToken = null;
    let passengerEmail = null;

    beforeAll(async () => {
        passengerEmail = `${unique()}@example.com`;
        const res = await request(app).post('/api/auth/register').send({
            first_name: 'Logout', last_name: 'Tester', email: passengerEmail,
            password: 'passenger123', role: 'passenger'
        });
        passengerToken = res.body.token;
    });

    test('POST /api/auth/logout revokes token and subsequent requests fail', async () => {
        // Confirm token works first
        const testBefore = await request(app)
            .get('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(testBefore.status).toBe(200);

        // Perform logout
        const logoutRes = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.message).toBe('Logged out successfully');

        // Verify token is blacklisted by checking subsequent requests
        const testAfter = await request(app)
            .get('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(testAfter.status).toBe(401);
        expect(testAfter.body.error).toContain('revoked');
    });
});
