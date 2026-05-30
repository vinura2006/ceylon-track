const request = require('supertest');
const { app } = require('../index');
const pool = require('../db/pool');

describe('Staff Management and Administrative Creation API', () => {
    const unique = () => `mgt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let adminToken = null;
    let passengerToken = null;
    let stationMasterToken = null;
    let stationMasterId = null;

    async function createStaffAndGetToken(subRole = 'driver') {
        const email = `${unique()}@example.com`;
        const empId = 'EMP-' + unique();
        await request(app).post('/api/auth/register').send({
            first_name: 'Staff', last_name: subRole, email,
            password: 'staffuser123', role: 'staff',
            employee_id: empId, staff_access_code: 'SLR-STAFF-2026',
            sub_role: subRole
        });
        
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        const userId = userRes.rows[0].id;
        
        await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [email]);
        
        const login = await request(app).post('/api/auth/login')
            .send({ login_type: 'staff', employee_id: empId, password: 'staffuser123' });
            
        return { token: login.body.token, userId };
    }

    beforeAll(async () => {
        // Admin token
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ login_type: 'admin', email: 'admin@ceylon.lk', password: 'Admin123!' });
        if (adminLogin.body.token) adminToken = adminLogin.body.token;

        // Passenger token
        const paxEmail = `${unique()}@example.com`;
        const paxRes = await request(app).post('/api/auth/register').send({
            first_name: 'Pax', last_name: 'MgtTest', email: paxEmail,
            password: 'passenger123', role: 'passenger'
        });
        passengerToken = paxRes.body.token;

        // Station master token
        const smData = await createStaffAndGetToken('station_master');
        stationMasterToken = smData.token;
        stationMasterId = smData.userId;
    });

    test('PUT /api/auth/staff/:id/status allows admin to change staff status', async () => {
        // Register a pending staff first
        const email = `${unique()}@example.com`;
        const empId = 'EMP-' + unique();
        await request(app).post('/api/auth/register').send({
            first_name: 'Pending', last_name: 'Staff', email,
            password: 'staffuser123', role: 'staff',
            employee_id: empId, staff_access_code: 'SLR-STAFF-2026',
            sub_role: 'driver'
        });

        const staffRes = await pool.query('SELECT id, role, status FROM users WHERE email = $1', [email]);
        const staffId = staffRes.rows[0].id;

        // Approve staff
        const approveRes = await request(app)
            .put(`/api/auth/staff/${staffId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'active' });
        expect(approveRes.status).toBe(200);
        expect(approveRes.body.user.status).toBe('active');

        // Suspend staff
        const suspendRes = await request(app)
            .put(`/api/auth/staff/${staffId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'suspended' });
        expect(suspendRes.status).toBe(200);
        expect(suspendRes.body.user.status).toBe('suspended');

        // Cleanup
        await pool.query('DELETE FROM users WHERE id = $1', [staffId]);
    });

    test('PUT /api/auth/staff/:id/status blocks passengers (403)', async () => {
        const res = await request(app)
            .put(`/api/auth/staff/1/status`)
            .set('Authorization', `Bearer ${passengerToken}`)
            .send({ status: 'active' });
        expect(res.status).toBe(403);
    });

    test('POST /api/staff/set-station allows station master to set home station', async () => {
        const res = await request(app)
            .post('/api/staff/set-station')
            .set('Authorization', `Bearer ${stationMasterToken}`)
            .send({ stationId: 1 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify in DB
        const check = await pool.query('SELECT home_station_id FROM users WHERE id = $1', [stationMasterId]);
        expect(check.rows[0].home_station_id).toBe(1);
    });

    test('POST /api/staff/stations allows admin to create station', async () => {
        const code = 'C' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const res = await request(app)
            .post('/api/staff/stations')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'New Administrative Station',
                code,
                lat: 6.9,
                lng: 79.8
            });
        expect(res.status).toBe(201);
        expect(res.body.station).toBeDefined();
        expect(res.body.station.code).toBe(code);

        // Cleanup
        await pool.query('DELETE FROM stations WHERE id = $1', [res.body.station.id]);
    });

    test('POST /api/staff/schedules allows admin to create schedule', async () => {
        const train_number = 'N' + Math.random().toString(36).slice(2, 7).toUpperCase();
        const res = await request(app)
            .post('/api/staff/schedules')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                train_number,
                train_name: 'Sprint Schedule',
                from_station_id: 1,
                to_station_id: 2,
                departure_time: '08:00:00',
                arrival_time: '10:00:00',
                class: 'mixed'
            });
        expect(res.status).toBe(201);
        expect(res.body.schedule).toBeDefined();
        expect(res.body.schedule.trainNumber).toBe(train_number);

        // Cleanup
        await pool.query('DELETE FROM schedules WHERE id = $1', [res.body.schedule.id]);
    });
});
