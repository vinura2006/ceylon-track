const axios = require('axios');
require('dotenv').config({ path: __dirname + '/.env' });

const API_BASE_URL = 'http://localhost:3000';
const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
});

const staffCredentials = {
    email: 'staff@ceylontrack.lk',
    password: 'password123',
};

const GPS_TOKEN = process.env.GPS_DEVICE_TOKEN;

const colors = {
    reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", cyan: "\x1b[36m", yellow: "\x1b[33m"
};

const log = (color, message) => console.log(`${color}%s${colors.reset}`, message);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function runTests() {
    let jwtToken = null;
    let watchId = null;

    try {
        // --- Test 1: GPS Update ---
        log(colors.cyan, '\nTest 1: POST /api/gps/update');
        const gpsRes = await client.post('/api/gps/update', {
            train_id: 1, latitude: 6.9338, longitude: 79.8500, speed_kmh: 45, device_token: GPS_TOKEN
        });
        assert(gpsRes.status === 200, 'Expected status 200 for GPS update');
        log(colors.green, '✅ Test 1 Passed: GPS position updated successfully');

        // --- Test 2: GPS Live Trains ---
        log(colors.cyan, '\nTest 2: GET /api/gps/trains/live');
        const liveRes = await client.get('/api/gps/trains/live');
        assert(liveRes.status === 200, 'Expected status 200');
        assert(Array.isArray(liveRes.data) && liveRes.data.length > 0, 'Expected live trains array');
        log(colors.green, '✅ Test 2 Passed: Retrieved live trains');

        // --- Test 3: GPS Train Track ---
        log(colors.cyan, '\nTest 3: GET /api/gps/trains/1/track');
        const trackRes = await client.get('/api/gps/trains/1/track');
        assert(trackRes.status === 200, 'Expected status 200');
        assert(Array.isArray(trackRes.data), 'Expected track array');
        log(colors.green, '✅ Test 3 Passed: Retrieved train track');

        // --- Test 4: Auth Login ---
        log(colors.cyan, '\nTest 4: POST /api/auth/login');
        const loginRes = await client.post('/api/auth/login', staffCredentials);
        jwtToken = loginRes.data.token;
        assert(jwtToken, 'Expected JWT token');
        const headers = { Authorization: `Bearer ${jwtToken}` };
        log(colors.green, '✅ Test 4 Passed: Authenticated successfully');

        // --- Test 5: Create JourneyWatch ---
        log(colors.cyan, '\nTest 5: POST /api/journeywatch');
        // Clean up any existing watch first (optional, but helps if rerunning)
        try {
            const tempRes = await client.get('/api/journeywatch', { headers });
            for (const w of tempRes.data) {
                if (w.train_id === 1) await client.delete(`/api/journeywatch/${w.id}`, { headers });
            }
        } catch(e) {}

        const today = new Date().toISOString().split('T')[0];
        const watchCreateRes = await client.post('/api/journeywatch', {
            train_id: 1, travel_date: today
        }, { headers });
        assert(watchCreateRes.status === 201, 'Expected status 201 Created');
        log(colors.green, '✅ Test 5 Passed: Created journey watch');

        // --- Test 6: Get JourneyWatches ---
        log(colors.cyan, '\nTest 6: GET /api/journeywatch');
        const watchesRes = await client.get('/api/journeywatch', { headers });
        assert(watchesRes.status === 200, 'Expected status 200');
        assert(watchesRes.data.length > 0, 'Expected at least one watch');
        watchId = watchesRes.data.find(w => w.train_id === 1).id;
        log(colors.green, '✅ Test 6 Passed: Fetched journey watches');

        // --- Test 7: Check JourneyWatch ---
        log(colors.cyan, '\nTest 7: GET /api/journeywatch/check');
        const checkRes = await client.get('/api/journeywatch/check?train_id=1', { headers });
        assert(checkRes.status === 200 && checkRes.data.watched === true, 'Expected to be watched');
        log(colors.green, '✅ Test 7 Passed: Confirmed watch status');

        // --- Test 8: Patch Notifications ---
        log(colors.cyan, '\nTest 8: PATCH /api/journeywatch/:id/notifications');
        const patchRes = await client.patch(`/api/journeywatch/${watchId}/notifications`, {
            notify_delays: false
        }, { headers });
        assert(patchRes.status === 200, 'Expected status 200');
        log(colors.green, '✅ Test 8 Passed: Updated notifications');

        // --- Test 9: Delete JourneyWatch ---
        log(colors.cyan, '\nTest 9: DELETE /api/journeywatch/:id');
        const delRes = await client.delete(`/api/journeywatch/${watchId}`, { headers });
        assert(delRes.status === 200, 'Expected status 200');
        log(colors.green, '✅ Test 9 Passed: Deleted journey watch');

        log(colors.green, '\n🎉 All Sprint 3 API tests passed successfully!');
    } catch (error) {
        log(colors.red, `\n❌ Test Failed: ${error.message}`);
        if (error.response) {
            log(colors.red, `   - Status: ${error.response.status}`);
            log(colors.red, `   - Data: ${JSON.stringify(error.response.data)}`);
        }
        process.exit(1);
    }
}

runTests();
