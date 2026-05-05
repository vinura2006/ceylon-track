const axios = require('axios');

// --- Configuration ---
const API_BASE_URL = 'http://localhost:3000';
const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000, // 5 second timeout
});

// --- Test Data ---
const staffCredentials = {
    email: 'staff@ceylontrack.lk',
    password: 'password123',
};

// --- Helper for colored output ---
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
};

const log = (color, message) => console.log(`${color}%s${colors.reset}`, message);
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

// --- Test Runner ---
async function runTests() {
    let jwtToken = null;

    try {
        // --- Test 1: Station API Test ---
        log(colors.cyan, 'Running Test 1: GET /api/stations...');
        const stationsResponse = await client.get('/api/stations');
        assert(stationsResponse.status === 200, 'Expected status 200 for stations endpoint');
        assert(Array.isArray(stationsResponse.data.stations), 'Expected stations to be an array');
        assert(stationsResponse.data.stations.length > 0, 'Expected at least one station');
        log(colors.green, '✅ Test 1 Passed: Successfully fetched stations.');

        // --- Test 2: Search API Test ---
        log(colors.cyan, '\nRunning Test 2: GET /api/schedules/search...');
        const searchResponse = await client.get('/api/schedules/search?from=FOT&to=BAD&date=2026-04-24');
        assert(searchResponse.status === 200, 'Expected status 200 for search endpoint');
        assert(Array.isArray(searchResponse.data.schedules), 'Expected schedules to be an array');
        if (searchResponse.data.schedules.length > 0) {
            const firstSchedule = searchResponse.data.schedules[0];
            assert(firstSchedule.hasOwnProperty('available_classes'), 'Schedule should have available_classes');
            assert(firstSchedule.hasOwnProperty('reliability'), 'Schedule should have reliability data');
            log(colors.green, '✅ Test 2 Passed: Successfully fetched schedules with reliability and class data.');
        } else {
            log(colors.yellow, '⚠️ Test 2 Warning: Search returned no schedules, but API responded correctly.');
        }

        // --- Test 3: Security/Staff Role Test (Failure) ---
        log(colors.cyan, '\nRunning Test 3: POST /api/staff/trains/1/status (Unauthorized)...');
        try {
            await client.post('/api/staff/trains/1/status', { delay_minutes: 10 });
            // If this line is reached, the test fails because it should have thrown an error
            throw new Error('Staff endpoint did not reject unauthorized request.');
        } catch (error) {
            assert(error.response && error.response.status === 401, 'Expected status 401 for unauthorized request');
            log(colors.green, '✅ Test 3 Passed: Correctly rejected request with 401 Unauthorized.');
        }

        // --- Test 4: Authentication Flow ---
        log(colors.cyan, '\nRunning Test 4: POST /api/auth/login...');
        const loginResponse = await client.post('/api/auth/login', staffCredentials);
        assert(loginResponse.status === 200, 'Expected status 200 for login');
        assert(loginResponse.data.token, 'Expected a JWT token in the login response');
        jwtToken = loginResponse.data.token;
        log(colors.green, '✅ Test 4 Passed: Successfully logged in and retrieved JWT token.');

        // --- Test 5: Security/Staff Role Test (Success) ---
        log(colors.cyan, '\nRunning Test 5: POST /api/staff/trains/1/status (Authorized)...');
        const statusUpdatePayload = {
            delay_minutes: 15,
            status: 'Delayed',
            notes: 'Automated test delay update'
        };
        const statusUpdateResponse = await client.post('/api/staff/trains/1/status', statusUpdatePayload, {
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });
        assert(statusUpdateResponse.status === 200, 'Expected status 200 for authorized status update');
        assert(statusUpdateResponse.data.success === true, 'Expected success:true in response body');
        assert(statusUpdateResponse.data.update.delay_minutes === 15, 'Expected delay_minutes to be updated');
        log(colors.green, '✅ Test 5 Passed: Successfully updated train status with staff credentials.');


        log(colors.green, '\n🎉 All tests passed successfully!');

    } catch (error) {
        log(colors.red, `\n❌ Test Failed: ${error.message}`);
        if (error.response) {
            log(colors.red, `   - Status: ${error.response.status}`);
            log(colors.red, `   - Data: ${JSON.stringify(error.response.data)}`);
        }
        process.exit(1); // Exit with an error code
    }
}

// Execute the tests
runTests();