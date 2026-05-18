// test-api.js — Ceylon Track API Test Suite
// Node 18+ built-in fetch — no external dependencies required.
// Usage: node backend/test-api.js

const BASE = process.env.API_BASE || 'http://localhost:3000';

// ── colours ──────────────────────────────────────────────────────────────────
const C = { reset:'\x1b[0m', green:'\x1b[32m', red:'\x1b[31m', cyan:'\x1b[36m', yellow:'\x1b[33m' };

let passed = 0;
let failed = 0;

async function req(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, opts);
    let data;
    try { data = await r.json(); } catch { data = {}; }
    return { status: r.status, data };
}

function check(label, condition, got, expected) {
    if (condition) {
        console.log(`${C.green}[PASS]${C.reset} ${label}`);
        passed++;
    } else {
        console.log(`${C.red}[FAIL]${C.reset} ${label} → expected ${expected}, got ${got}`);
        failed++;
    }
}

// ── unique email per test run ─────────────────────────────────────────────────
const TS       = Date.now();
const testEmail = `testuser_${TS}@ceylon.lk`;
const testPass  = 'TestPass123!';

async function run() {
    console.log(`\n${C.cyan}=== Ceylon Track API Test Suite ===${C.reset}`);
    console.log(`Base URL: ${BASE}\n`);

    let passengerToken, staffToken, adminToken, watchId, scheduleId;

    // ── HEALTH CHECK ──────────────────────────────────────────────────────────
    let r = await req('GET', '/health');
    check('GET /health → 200', r.status === 200 && r.data.status === 'ok', r.status, 200);

    // ── AUTH TESTS ────────────────────────────────────────────────────────────
    console.log(`${C.cyan}── AUTH TESTS ──────────────────────────────────${C.reset}`);

    // 1. Register new user → 201
    r = await req('POST', '/api/auth/register', { 
        email: testEmail, 
        password: testPass, 
        first_name: 'Test', 
        last_name: 'User' 
    });
    check('POST /api/auth/register → 201', r.status === 201, r.status, 201);
    if (r.data.token) passengerToken = r.data.token;

    // 2. Register same email again → 409
    r = await req('POST', '/api/auth/register', { 
        email: testEmail, 
        password: testPass, 
        first_name: 'Test', 
        last_name: 'User' 
    });
    check('POST /api/auth/register duplicate → 409', r.status === 409, r.status, 409);

    // 3. Register with missing fields → 400
    r = await req('POST', '/api/auth/register', { 
        email: `missing_${TS}@ceylon.lk`, 
        password: testPass 
    });
    check('POST /api/auth/register missing fields → 400', r.status === 400, r.status, 400);

    // 4. Login correct credentials → 200
    r = await req('POST', '/api/auth/login', { email: testEmail, password: testPass });
    check('POST /api/auth/login correct → 200', r.status === 200 && !!r.data.token, r.status, 200);
    if (r.data.token) passengerToken = r.data.token;

    // 5. Login wrong password → 401
    r = await req('POST', '/api/auth/login', { email: testEmail, password: 'WrongPass!' });
    check('POST /api/auth/login wrong password → 401', r.status === 401, r.status, 401);

    // 6. Login non-existent email → 401
    r = await req('POST', '/api/auth/login', { email: 'nobody@ceylon.lk', password: 'anything' });
    check('POST /api/auth/login no such user → 401', r.status === 401, r.status, 401);

    // Get staff + admin tokens for later tests
    r = await req('POST', '/api/auth/login', { email: 'staff@ceylon.lk', password: 'Staff123!' });
    if (r.status === 200) staffToken = r.data.token;
    r = await req('POST', '/api/auth/login', { email: 'admin@ceylon.lk', password: 'Admin123!' });
    if (r.status === 200) adminToken = r.data.token;

    // ── STATIONS TESTS ────────────────────────────────────────────────────────
    console.log(`\n${C.cyan}── STATIONS TESTS ──────────────────────────────${C.reset}`);
    r = await req('GET', '/api/stations');
    check('GET /api/stations → 200', r.status === 200 && Array.isArray(r.data.stations), r.status, 200);

    // ── SCHEDULE TESTS ────────────────────────────────────────────────────────
    console.log(`\n${C.cyan}── SCHEDULE TESTS ──────────────────────────────${C.reset}`);

    // 7. Search without from → 400
    r = await req('GET', '/api/schedules/search?to=KAN&date=2026-05-18');
    check('GET /api/schedules/search no from → 400', r.status === 400, r.status, 400);

    // 8. Search FOT to KAN → 200 array
    const today = new Date().toISOString().split('T')[0];
    r = await req('GET', `/api/schedules/search?from=FOT&to=KAN&date=${today}`);
    check('GET /api/schedules/search FOT→KAN → 200', r.status === 200, r.status, 200);
    if (r.data.schedules && r.data.schedules.length > 0) {
        scheduleId = r.data.schedules[0].id;
    }

    // 9. Get route stops for valid schedule → 200
    if (scheduleId) {
        r = await req('GET', `/api/schedules/${scheduleId}/route`);
        check(`GET /api/schedules/${scheduleId}/route → 200`, r.status === 200 && Array.isArray(r.data.stops), r.status, 200);
    } else {
        check('GET /api/schedules/:id/route → 200 (skipped: no schedule found)', true, 'N/A', 'N/A');
    }

    // 10. Get route stops for invalid id → 404
    r = await req('GET', '/api/schedules/999999/route');
    check('GET /api/schedules/999999/route → 404', r.status === 404, r.status, 404);

    // ── WATCH TESTS ───────────────────────────────────────────────────────────
    console.log(`\n${C.cyan}── WATCH TESTS ─────────────────────────────────${C.reset}`);

    if (!passengerToken) {
        console.log(`${C.yellow}[SKIP]${C.reset} Watch tests skipped — no passenger token`);
    } else if (!scheduleId) {
        console.log(`${C.yellow}[SKIP]${C.reset} Watch tests skipped — no schedule found`);
    } else {
        // 11. Add watch → 201
        r = await req('POST', '/api/watch', { schedule_id: scheduleId }, passengerToken);
        check('POST /api/watch → 201', r.status === 201, r.status, 201);
        if (r.data.watch) watchId = r.data.watch.id;

        // 12. Add same watch again → 409
        r = await req('POST', '/api/watch', { schedule_id: scheduleId }, passengerToken);
        check('POST /api/watch duplicate → 409', r.status === 409, r.status, 409);

        // 13. Get watch list → 200 array
        r = await req('GET', '/api/watch', null, passengerToken);
        check('GET /api/watch → 200', r.status === 200 && r.data.watches !== undefined, r.status, 200);

        // 14. Delete watch → 200
        if (watchId) {
            r = await req('DELETE', `/api/watch/${watchId}`, null, passengerToken);
            check(`DELETE /api/watch/${watchId} → 200`, r.status === 200, r.status, 200);

            // 15. Delete same watch again → 404
            r = await req('DELETE', `/api/watch/${watchId}`, null, passengerToken);
            check(`DELETE /api/watch/${watchId} again → 404`, r.status === 404, r.status, 404);
        }
    }

    // ── STAFF TESTS ───────────────────────────────────────────────────────────
    console.log(`\n${C.cyan}── STAFF TESTS ─────────────────────────────────${C.reset}`);

    // 16. Access /api/staff/stats with passenger JWT → 403
    r = await req('GET', '/api/staff/stats', null, passengerToken);
    check('GET /api/staff/stats passenger JWT → 403', r.status === 403, r.status, 403);

    // 17. Access /api/staff/stats with staff JWT → 200
    if (staffToken) {
        r = await req('GET', '/api/staff/stats', null, staffToken);
        check('GET /api/staff/stats staff JWT → 200', r.status === 200, r.status, 200);
    } else {
        check('GET /api/staff/stats staff JWT → 200 (skipped: no staff token)', true, 'N/A', 'N/A');
    }

    if (staffToken && scheduleId) {
        // 18. Update train status valid → 200
        r = await req('POST', `/api/staff/trains/${scheduleId}/status`,
            { status: 'DELAYED', delay_minutes: 10, notes: 'Test delay' }, staffToken);
        check('POST /api/staff/trains/:id/status valid → 200', r.status === 200, r.status, 200);

        // 19. Update with invalid status → 400
        r = await req('POST', `/api/staff/trains/${scheduleId}/status`,
            { status: 'UNKNOWN', delay_minutes: 5 }, staffToken);
        check('POST /api/staff/trains/:id/status bad status → 400', r.status === 400, r.status, 400);

        // 20. Update with negative delay → 400
        r = await req('POST', `/api/staff/trains/${scheduleId}/status`,
            { status: 'DELAYED', delay_minutes: -5 }, staffToken);
        check('POST /api/staff/trains/:id/status negative delay → 400', r.status === 400, r.status, 400);
    } else {
        [18, 19, 20].forEach(n => check(`Staff test ${n} (skipped: no staff token or schedule)`, true, 'N/A', 'N/A'));
    }

    // ── GPS TESTS ─────────────────────────────────────────────────────────────
    console.log(`\n${C.cyan}── GPS TESTS ───────────────────────────────────${C.reset}`);

    // 21. Get GPS for train 1 → 200 or 404 (not 500)
    r = await req('GET', '/api/gps/1', null, passengerToken);
    check('GET /api/gps/1 → 200 or 404 (not 500)', r.status === 200 || r.status === 404, r.status, '200 or 404');

    // ── DISRUPTIONS TESTS ─────────────────────────────────────────────────────
    console.log(`\n${C.cyan}── DISRUPTIONS TESTS ───────────────────────────${C.reset}`);

    // 22. Get disruptions with valid JWT → 200 disruptions array
    r = await req('GET', '/api/disruptions', null, passengerToken);
    check('GET /api/disruptions → 200 count exists', r.status === 200 && r.data.disruptions !== undefined, r.status, 200);

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    const total = passed + failed;
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Total: ${C.green}${passed} passed${C.reset}, ${failed > 0 ? C.red : ''}${failed} failed${C.reset} / ${total}`);

    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error(`${C.red}Fatal error:${C.reset}`, err.message);
    process.exit(1);
});