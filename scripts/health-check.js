const BASE = process.env.CHECK_URL || 'http://localhost:3000';

const checks = [
  { name: 'Health endpoint', url: '/health', expect: 200 },
  { name: 'Stations list', url: '/api/stations', expect: 200 },
  { name: 'Timetable', url: '/api/timetable', expect: 200 },
  { name: 'Schedule search', url: '/api/schedules/search?from=FOT&to=KAN', expect: 200 },
  { name: 'Auth required — no token', url: '/api/watch', expect: 401 },
  { name: 'Staff only — no token', url: '/api/staff/stats', expect: 401 },
];

async function runChecks() {
    let failed = false;
    for (const check of checks) {
        try {
            const res = await fetch(`${BASE}${check.url}`);
            if (res.status === check.expect) {
                console.log(`[PASS] ${check.name} (${res.status})`);
            } else {
                console.error(`[FAIL] ${check.name} - Expected ${check.expect}, got ${res.status}`);
                failed = true;
            }
        } catch (error) {
            console.error(`[FAIL] ${check.name} - Error: ${error.message}`);
            failed = true;
        }
    }
    
    if (failed) {
        console.error('Health checks failed.');
        process.exit(1);
    } else {
        console.log('All health checks passed.');
        process.exit(0);
    }
}

runChecks();
