const BASE = process.env.TEST_URL || 'http://localhost:3000';
let passengerToken = null;
let staffToken = null;
let adminToken = null;
let testWatchId = null;
let testAssignmentId = null;

const email = `uat_${Date.now()}@test.lk`;
const staffEmail = 'staff@ceylon.lk';
const adminEmail = 'admin@ceylon.lk';

// Test runner
let passed = 0, failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch(e) {
    console.log(`  [FAIL] ${name} — ${e.message}`);
    failed++;
  }
}
function expect(val, msg) {
  if (!val) throw new Error(msg || `Assertion failed: ${JSON.stringify(val)}`);
}

async function runAll() {
    console.log('\n=== JOURNEY 1: Passenger registration and search ===');

    await test('Homepage serves index.html', async () => {
    const r = await fetch(BASE + '/');
    expect(r.ok, `Expected 200, got ${r.status}`);
    const html = await r.text();
    expect(html.includes('Ceylon Track'), 'Homepage missing Ceylon Track title');
    });

    await test('Health check passes', async () => {
    const r = await fetch(BASE + '/health');
    const d = await r.json();
    expect(r.ok && d.status === 'ok');
    });

    await test('New passenger can register', async () => {
    const r = await fetch(BASE + '/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password: 'UatTest123!', first_name: 'UAT', last_name: 'Tester' })
    });
    const d = await r.json();
    expect(r.status === 201, `Expected 201, got ${r.status}: ${d.error}`);
    expect(d.token, 'No token in response');
    passengerToken = d.token;
    });

    await test('Cannot register same email twice', async () => {
    const r = await fetch(BASE + '/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password: 'UatTest123!', first_name: 'UAT', last_name: 'Tester' })
    });
    expect(r.status === 409, `Expected 409 conflict, got ${r.status}`);
    });

    await test('Stations list returns 10+ stations', async () => {
    const r = await fetch(BASE + '/api/stations');
    const d = await r.json();
    expect(r.ok && d.stations && d.stations.length >= 10,
        `Expected 10+ stations, got ${d.stations?.length}`);
    });

    await test('Search Colombo Fort to Kandy returns results', async () => {
    const r = await fetch(BASE + '/api/schedules/search?from=FOT&to=KAN');
    const d = await r.json();
    expect(r.ok, `Search failed: ${r.status}`);
    expect(d.schedules && d.schedules.length > 0, 'No schedules returned for FOT→KAN');
    expect(d.schedules[0].trainNumber, 'Schedule missing trainNumber');
    expect(d.schedules[0].liveStatus, 'Schedule missing liveStatus');
    });

    await test('Search returns reliability badge', async () => {
    const r = await fetch(BASE + '/api/schedules/search?from=FOT&to=KAN');
    const d = await r.json();
    const reliabilities = ['USUALLY_ON_TIME','SOMETIMES_DELAYED','OFTEN_LATE','NO_DATA'];
    expect(reliabilities.includes(d.schedules[0].reliability),
        `Invalid reliability: ${d.schedules[0].reliability}`);
    });

    await test('Case-insensitive search works (lowercase)', async () => {
    const r = await fetch(BASE + '/api/schedules/search?from=fot&to=kan');
    const d = await r.json();
    expect(r.ok && d.schedules && d.schedules.length > 0, 'Lowercase search failed');
    });

    await test('Missing from/to returns 400', async () => {
    const r = await fetch(BASE + '/api/schedules/search?from=FOT');
    expect(r.status === 400, `Expected 400, got ${r.status}`);
    });

    await test('Route stops available for schedule 1', async () => {
    const r = await fetch(BASE + '/api/schedules/1/route');
    const d = await r.json();
    expect(r.ok && d.stops && d.stops.length > 0, 'No stops for schedule 1');
    expect(d.stops[0].stationName, 'Stop missing stationName');
    expect(d.stops[0].scheduledTime, 'Stop missing scheduledTime');
    });

    console.log('\n=== JOURNEY 2: Journey watch ===');

    await test('Cannot watch without auth', async () => {
    const r = await fetch(BASE + '/api/watch', { method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ schedule_id: 1 }) });
    expect(r.status === 401, `Expected 401, got ${r.status}`);
    });

    await test('Passenger can add a watch', async () => {
    const r = await fetch(BASE + '/api/watch', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+passengerToken},
        body: JSON.stringify({ schedule_id: 1 })
    });
    const d = await r.json();
    expect(r.status === 201, `Expected 201, got ${r.status}: ${d.error}`);
    expect(d.watch && d.watch.id, 'No watch id returned');
    testWatchId = d.watch.id;
    });

    await test('Cannot add same watch twice', async () => {
    const r = await fetch(BASE + '/api/watch', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+passengerToken},
        body: JSON.stringify({ schedule_id: 1 })
    });
    expect(r.status === 409, `Expected 409 conflict, got ${r.status}`);
    });

    await test('Watch list shows the added watch', async () => {
    const r = await fetch(BASE + '/api/watch', {
        headers: {'Authorization':'Bearer '+passengerToken}
    });
    const d = await r.json();
    expect(r.ok && d.watches && d.watches.length >= 1, 'Watch not in list');
    });

    await test('Passenger can remove a watch', async () => {
    const r = await fetch(BASE + '/api/watch/' + testWatchId, {
        method: 'DELETE',
        headers: {'Authorization':'Bearer '+passengerToken}
    });
    expect(r.ok, `Expected 200, got ${r.status}`);
    });

    await test('Removed watch no longer in list', async () => {
    const r = await fetch(BASE + '/api/watch', {
        headers: {'Authorization':'Bearer '+passengerToken}
    });
    const d = await r.json();
    const found = d.watches?.find(w => w.id === testWatchId);
    expect(!found, 'Deleted watch still in list');
    });

    console.log('\n=== JOURNEY 3: Staff operations ===');

    await test('Staff can login', async () => {
    const r = await fetch(BASE + '/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email: staffEmail, password: 'Staff123!' })
    });
    const d = await r.json();
    expect(r.ok, `Staff login failed: ${r.status} ${d.error}`);
    expect(d.token, 'No token');
    expect(d.user.role === 'staff', `Wrong role: ${d.user.role}`);
    staffToken = d.token;
    });

    await test('Staff can view dashboard stats', async () => {
    const r = await fetch(BASE + '/api/staff/stats', {
        headers: {'Authorization':'Bearer '+staffToken}
    });
    const d = await r.json();
    expect(r.ok, `Stats failed: ${r.status}`);
    expect(typeof d.activeSchedules === 'number', 'Missing activeSchedules');
    expect(typeof d.activeWatchers === 'number', 'Missing activeWatchers');
    });

    await test('Passenger cannot access staff stats', async () => {
    const r = await fetch(BASE + '/api/staff/stats', {
        headers: {'Authorization':'Bearer '+passengerToken}
    });
    expect(r.status === 403, `Expected 403, got ${r.status}`);
    });

    await test('Staff can assign to train', async () => {
    const r = await fetch(BASE + '/api/assignments/start', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ schedule_id: 1 })
    });
    const d = await r.json();
    const ok = r.status === 201 || r.status === 409 || r.status === 200;
    expect(ok, `Expected 201, 200 or 409, got ${r.status}: ${d.error}`);
    if (r.status === 201) testAssignmentId = d.assignment?.id;
    });

    await test('Staff can update train to ON_TIME', async () => {
    const r = await fetch(BASE + '/api/staff/trains/1/status', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ status: 'ON_TIME', delay_minutes: 0 })
    });
    expect(r.ok, `Status update failed: ${r.status}`);
    });

    await test('Staff can update train to DELAYED', async () => {
    const r = await fetch(BASE + '/api/staff/trains/1/status', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ status: 'DELAYED', delay_minutes: 15, notes: 'UAT test delay' })
    });
    expect(r.ok, `Delay update failed: ${r.status}`);
    });

    await test('Negative delay is rejected', async () => {
    const r = await fetch(BASE + '/api/staff/trains/1/status', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ status: 'DELAYED', delay_minutes: -5 })
    });
    expect(r.status === 400, `Expected 400 for negative delay, got ${r.status}`);
    });

    await test('Invalid status is rejected', async () => {
    const r = await fetch(BASE + '/api/staff/trains/1/status', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ status: 'ONFIRE', delay_minutes: 0 })
    });
    expect(r.status === 400, `Expected 400 for invalid status, got ${r.status}`);
    });

    await test('Staff can update last stop', async () => {
    const r = await fetch(BASE + '/api/laststop/update', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ schedule_id: 1, station_name: 'Rambukkana' })
    });
    expect(r.ok, `Last stop update failed: ${r.status}`);
    });

    await test('Last stop is publicly readable', async () => {
    const r = await fetch(BASE + '/api/laststop/1');
    expect(r.ok, `Last stop not readable: ${r.status}`);
    const d = await r.json();
    expect(d.stationName, 'No stationName in last stop response');
    });

    await test('Staff can cancel assignment', async () => {
    const r = await fetch(BASE + '/api/assignments/stop', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({})
    });
    expect(r.ok, `Cancel assignment failed: ${r.status}`);
    });

    console.log('\n=== JOURNEY 4: GPS tracking ===');

    await test('Re-assign staff to train for GPS test', async () => {
    const r = await fetch(BASE + '/api/assignments/start', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ schedule_id: 2 })
    });
    });

    await test('Staff can push GPS coordinates', async () => {
    const r = await fetch(BASE + '/api/gps/mobile-update', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ schedule_id: 2, lat: 6.9553, lng: 80.0242 })
    });
    expect(r.ok, `GPS push failed: ${r.status}`);
    const d = await r.json();
    expect(d.lat && d.lng, 'GPS response missing lat/lng');
    });

    await test('Out-of-bounds coordinates rejected', async () => {
    const r = await fetch(BASE + '/api/gps/mobile-update', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+staffToken},
        body: JSON.stringify({ schedule_id: 2, lat: 999, lng: 999 })
    });
    expect(r.status === 400, `Expected 400 for invalid coords, got ${r.status}`);
    });

    await test('GPS location is publicly readable', async () => {
    const r = await fetch(BASE + '/api/gps/2');
    expect(r.ok, `GPS read failed: ${r.status}`);
    const d = await r.json();
    expect(d.lat && d.lng, 'GPS response missing lat/lng');
    expect(typeof d.secondsAgo === 'number', 'Missing secondsAgo');
    });

    await test('All active trains endpoint works', async () => {
    const r = await fetch(BASE + '/api/gps/all-active');
    const d = await r.json();
    expect(r.ok, `All-active failed: ${r.status}`);
    expect(Array.isArray(d.trains), 'trains should be an array');
    });

    console.log('\n=== JOURNEY 5: Timetable and booking ===');

    await test('Timetable returns real SL trains', async () => {
    const r = await fetch(BASE + '/api/timetable');
    const d = await r.json();
    expect(r.ok && d.timetable && d.timetable.length >= 10,
        `Expected 10+ timetable entries, got ${d.timetable?.length}`);
    });

    await test('Timetable filter by route works', async () => {
    const r = await fetch(BASE + '/api/timetable?route=Main%20Line');
    const d = await r.json();
    expect(r.ok && d.count > 0, 'Main Line filter returned no results');
    });

    await test('Timetable entry has stops', async () => {
    const r = await fetch(BASE + '/api/timetable/1');
    const d = await r.json();
    expect(r.ok && d.stops && d.stops.length > 0, 'Timetable entry missing stops');
    });

    await test('Timetable routes list works', async () => {
    const r = await fetch(BASE + '/api/timetable/routes');
    const d = await r.json();
    expect(r.ok && d.routes && d.routes.length > 0, 'No routes returned');
    });

    await test('Ticket booking can be logged', async () => {
    const r = await fetch(BASE + '/api/timetable/book/1', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+passengerToken},
        body: JSON.stringify({
        from_station: 'Colombo Fort',
        to_station: 'Kandy',
        travel_date: new Date().toISOString().split('T')[0],
        passenger_count: 2,
        class: '2nd',
        pravesha_deep_link: 'https://www.pravesha.lk/booking?from=Colombo+Fort&to=Kandy'
        })
    });
    expect(r.ok, `Booking log failed: ${r.status}`);
    const d = await r.json();
    expect(d.bookingId, 'No bookingId in response');
    });

    console.log('\n=== JOURNEY 6: Disruptions ===');

    await test('Disruptions endpoint accessible', async () => {
    const r = await fetch(BASE + '/api/disruptions', {
        headers: {'Authorization':'Bearer '+passengerToken}
    });
    expect(r.ok, `Disruptions failed: ${r.status}`);
    const d = await r.json();
    expect(Array.isArray(d.trains), 'trains should be an array');
    });

    console.log('\n' + '='.repeat(50));
    console.log(`RESULTS: ${passed} passed, ${failed} failed / ${passed+failed} total`);
    if (failed > 0) { console.log('Some tests failed — see above for details'); process.exit(1); }
    else { console.log('All tests passed — system is production ready!'); }
}

runAll();
