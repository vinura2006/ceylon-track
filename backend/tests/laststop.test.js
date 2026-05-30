const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Laststop API', () => {
    const unique = () => `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let staffToken = null;
    let staffId = null;

    async function createStaffAndGetToken() {
        const email = `${unique()}@example.com`;
        const empId = 'EMP-' + unique();
        await request(app).post('/api/auth/register').send({
            first_name: 'Staff', last_name: 'LstTest', email,
            password: 'staffuser123', role: 'staff',
            employee_id: empId, staff_access_code: 'SLR-STAFF-2026',
            sub_role: 'staff'
        });
        
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        const userId = userRes.rows[0].id;
        
        await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [email]);
        
        const login = await request(app).post('/api/auth/login')
            .send({ login_type: 'staff', employee_id: empId, password: 'staffuser123' });
            
        return { token: login.body.token, userId };
    }

    beforeAll(async () => {
        const staffData = await createStaffAndGetToken();
        staffToken = staffData.token;
        staffId = staffData.userId;
    });

    afterEach(async () => {
        // Clean up last stops updates for schedule 1
        await pool.query('DELETE FROM train_last_stops WHERE schedule_id = 1');
        await pool.query('DELETE FROM trip_status_updates WHERE schedule_id = 1 AND trip_date = CURRENT_DATE');
    });

    test('POST /api/laststop/update updates the last stop of a schedule using station_id', async () => {
        const res = await request(app)
            .post('/api/laststop/update')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                schedule_id: 1,
                station_id: 2 // Kandy
            });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Last stop updated');
        expect(res.body.stationName).toBe('Kandy');
    });

    test('POST /api/laststop/update updates using station_name', async () => {
        const res = await request(app)
            .post('/api/laststop/update')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                schedule_id: 1,
                station_name: 'Colombo Fort'
            });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Last stop updated');
        expect(res.body.stationName).toBe('Colombo Fort');
    });

    test('POST /api/laststop/update with missing inputs returns 400', async () => {
        const res = await request(app)
            .post('/api/laststop/update')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                schedule_id: 1
            });
        expect(res.status).toBe(400);
    });

    test('GET /api/laststop/:scheduleId returns last stop info', async () => {
        // First populate one
        await request(app)
            .post('/api/laststop/update')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                schedule_id: 1,
                station_id: 2
            });

        const res = await request(app).get('/api/laststop/1');
        expect(res.status).toBe(200);
        expect(res.body.stationName).toBe('Kandy');
        expect(res.body.lat).toBeDefined();
        expect(res.body.lng).toBeDefined();
    });

    test('GET /api/laststop/:scheduleId with no data returns 404', async () => {
        const res = await request(app).get('/api/laststop/999');
        expect(res.status).toBe(404);
    });
});
