const wsClient = require('ws');
const { server } = require('../index');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

describe('WebSocket Server real-time API', () => {
    let port = 0;
    let url = '';
    let staffToken = null;
    let passengerToken = null;
    let passengerId = null;
    let staffId = null;

    const unique = () => `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    beforeAll(async () => {
        // Start listening on a free port
        await new Promise((resolve) => {
            server.listen(0, () => {
                port = server.address().port;
                url = `ws://localhost:${port}/ws`;
                resolve();
            });
        });

        // Seed a passenger
        const paxEmail = `${unique()}@example.com`;
        passengerToken = jwt.sign({ userId: 8881, email: paxEmail, role: 'passenger' }, JWT_SECRET);
        
        // Seed a staff member
        const staffEmail = `${unique()}@example.com`;
        staffToken = jwt.sign({ userId: 8882, email: staffEmail, role: 'staff' }, JWT_SECRET);

        // Ensure users exist in the "User" table to satisfy foreign keys in live_train_sessions
        // Use capitalized role 'Staff' to satisfy CHECK constraint
        await pool.query(
            `INSERT INTO "User" (id, email, password_hash, first_name, last_name, role) 
             VALUES (8882, $1, 'hashed', 'WS', 'Staff', 'Staff')
             ON CONFLICT (email) DO NOTHING`,
            [staffEmail]
        );
        // Ensure schedule 1 exists in schedules table
        const sched = await pool.query('SELECT id FROM schedules WHERE id = 1');
        if (sched.rows.length === 0) {
            await pool.query(
                `INSERT INTO schedules (id, train_number, train_name, from_station_id, to_station_id, departure_time, arrival_time)
                 VALUES (1, '1014', 'Intercity Express', 1, 2, '06:00:00', '08:30:00')`
            );
        }
    });

    afterAll(async () => {
        // Clean up database records and close server
        await pool.query('DELETE FROM live_train_sessions WHERE staff_id = 8882');
        await pool.query('DELETE FROM "User" WHERE id = 8882');
        await new Promise((resolve) => server.close(resolve));
    });

    test('Connect to WS, send valid auth → receive auth_ok', (done) => {
        const client = new wsClient(url);

        client.on('open', () => {
            client.send(JSON.stringify({
                type: 'auth',
                token: passengerToken
            }));
        });

        client.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            expect(msg.type).toBe('auth_ok');
            expect(msg.clientId).toBeDefined();
            client.close();
            done();
        });
    });

    test('Connect to WS, send invalid token → receive auth_error', (done) => {
        const client = new wsClient(url);

        client.on('open', () => {
            client.send(JSON.stringify({
                type: 'auth',
                token: 'invalid_token_value'
            }));
        });

        client.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            expect(msg.type).toBe('auth_error');
            expect(msg.error).toBe('Invalid token');
            client.close();
            done();
        });
    });

    test('Subscribe to train updates', (done) => {
        const client = new wsClient(url);

        client.on('open', () => {
            client.send(JSON.stringify({
                type: 'auth',
                token: passengerToken
            }));
        });

        client.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'auth_ok') {
                client.send(JSON.stringify({
                    type: 'subscribe_train',
                    trainId: '1'
                }));
            } else if (msg.type === 'subscribed') {
                expect(msg.trainId).toBe('1');
                client.close();
                done();
            }
        });
    });

    test('Broadcast live GPS update and handle session end', (done) => {
        const clientPassenger = new wsClient(url);
        const clientStaff = new wsClient(url);

        let gotUpdate = false;
        let gotOffline = false;

        clientPassenger.on('open', () => {
            clientPassenger.send(JSON.stringify({
                type: 'auth',
                token: passengerToken
            }));
        });

        clientPassenger.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'auth_ok') {
                clientPassenger.send(JSON.stringify({
                    type: 'subscribe_train',
                    trainId: '1'
                }));
            } else if (msg.type === 'subscribed') {
                // Connect staff client now that passenger is subscribed
                clientStaff.send(JSON.stringify({
                    type: 'auth',
                    token: staffToken
                }));
            } else if (msg.type === 'train_update') {
                expect(msg.trainId).toBe('1');
                expect(msg.latitude).toBe(6.9271);
                gotUpdate = true;

                // Send session ended signal
                clientStaff.send(JSON.stringify({
                    type: 'session_ended',
                    trainId: '1'
                }));
            } else if (msg.type === 'train_offline') {
                expect(msg.trainId).toBe('1');
                gotOffline = true;
                clientPassenger.close();
                clientStaff.close();
                done();
            }
        });

        clientStaff.on('open', () => {});
        clientStaff.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'auth_ok') {
                // Staff broadcasts GPS update
                clientStaff.send(JSON.stringify({
                    type: 'gps_update',
                    trainId: '1',
                    trainName: 'Intercity Express',
                    latitude: 6.9271,
                    longitude: 79.8612,
                    accuracy: 10.0,
                    speed: 45.2,
                    heading: 120.5,
                    timestamp: new Date().toISOString()
                }));
            }
        });
    });
});
