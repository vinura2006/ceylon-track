const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Watch (Journey Watches) API', () => {
    const unique = () => `wth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let passengerToken = null;
    let passengerId = null;
    let otherPassengerToken = null;

    async function createPassengerAndGetToken() {
        const email = `${unique()}@example.com`;
        const res = await request(app).post('/api/auth/register').send({
            first_name: 'Pax', last_name: 'WatchTest', email,
            password: 'passenger123', role: 'passenger'
        });
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        return { token: res.body.token, userId: userRes.rows[0].id };
    }

    beforeAll(async () => {
        const paxData = await createPassengerAndGetToken();
        passengerToken = paxData.token;
        passengerId = paxData.userId;

        const otherData = await createPassengerAndGetToken();
        otherPassengerToken = otherData.token;
    });

    afterEach(async () => {
        await pool.query('DELETE FROM journey_watches WHERE user_id = $1', [passengerId]);
    });

    test('POST /api/watch adds a watch for passenger', async () => {
        const res = await request(app)
            .post('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ schedule_id: 1 });
        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Journey watch added');
        expect(res.body.watch).toBeDefined();
        expect(res.body.watch.scheduleId).toBe(1);
    });

    test('POST /api/watch duplicate schedule_id returns 409', async () => {
        const first = await request(app)
            .post('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ schedule_id: 1 });
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ schedule_id: 1 });
        expect(second.status).toBe(409);
    });

    test('POST /api/watch with invalid schedule ID returns 404', async () => {
        const res = await request(app)
            .post('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ schedule_id: 999 });
        expect(res.status).toBe(404);
    });

    test('GET /api/watch returns all journey watches', async () => {
        await request(app)
            .post('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ schedule_id: 1 });

        const res = await request(app)
            .get('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.watches).toBeDefined();
        expect(Array.isArray(res.body.watches)).toBe(true);
        expect(res.body.watches.length).toBeGreaterThan(0);
    });

    test('DELETE /api/watch/:id removes the journey watch', async () => {
        const addRes = await request(app)
            .post('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ schedule_id: 1 });
        const watchId = addRes.body.watch.id;

        const res = await request(app)
            .delete(`/api/watch/${watchId}`)
            .set('Authorization', `Bearer ${passengerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Watch removed');
    });

    test('DELETE /api/watch/:id blocks unauthorized user (403)', async () => {
        const addRes = await request(app)
            .post('/api/watch')
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ schedule_id: 1 });
        const watchId = addRes.body.watch.id;

        const res = await request(app)
            .delete(`/api/watch/${watchId}`)
            .set('Authorization', `Bearer ${otherPassengerToken}`);
        expect(res.status).toBe(403);
    });
});
