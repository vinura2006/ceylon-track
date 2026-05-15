const request = require('supertest');
const app = require('../index');

describe('Staff / GPS admin API', () => {
    const unique = () => `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    async function registerAndToken(payload) {
        const res = await request(app).post('/api/auth/register').send(payload);
        expect(res.status).toBe(201);
        return res.body.token;
    }

    test('Test 1 — Update delay without token returns 401', async () => {
        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .send({ delay_minutes: 5 });
        expect(res.status).toBe(401);
    });

    test('Test 2 — Update delay with passenger JWT returns 403', async () => {
        const email = `${unique()}@example.com`;
        const token = await registerAndToken({
            name: 'Passenger Only',
            email,
            password: 'passenger1',
            role: 'passenger',
        });

        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ delay_minutes: 5 });
        expect(res.status).toBe(403);
    });

    test('Test 3 — Update delay with staff JWT and delay_minutes 10 returns 200', async () => {
        const email = `${unique()}@example.com`;
        const token = await registerAndToken({
            name: 'Staff User',
            email,
            password: 'staffuser1',
            role: 'staff',
        });

        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ delay_minutes: 10 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('Test 4 — Negative delay_minutes returns 400', async () => {
        const email = `${unique()}@example.com`;
        const token = await registerAndToken({
            name: 'Staff Neg',
            email,
            password: 'staffuser2',
            role: 'staff',
        });

        const res = await request(app)
            .post('/api/staff/trains/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ delay_minutes: -5 });
        expect(res.status).toBe(400);
    });

    test('Test 5 — POST /api/gps/update without correct GPS_DEVICE_TOKEN returns 401', async () => {
        const res = await request(app).post('/api/gps/update').send({
            train_id: 1,
            latitude: 6.93,
            longitude: 79.85,
            device_token: 'wrong-token-not-matching-env',
        });
        expect(res.status).toBe(401);
    });
});
