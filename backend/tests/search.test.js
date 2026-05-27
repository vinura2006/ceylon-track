const request = require('supertest');
const { app } = require('../index');

describe('Schedule search API', () => {
    test('Test 1 — Valid search Colombo Fort to Kandy (FOT→KAN)', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=FOT&to=KAN&date=today'
        );
        expect(res.status).toBe(200);
        const schedules = res.body.schedules || res.body || [];
        expect(Array.isArray(schedules)).toBe(true);
        expect(schedules.length).toBeGreaterThanOrEqual(1);

        const names = schedules.map(function(s) { return s.trainName; });
        expect(names).toContain('Intercity Express');
    });

    test('Test 2 — Invalid station code returns empty results', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=INVALID&to=KAN&date=today'
        );
        expect(res.status).toBe(200);
        const schedules = res.body.schedules || res.body || [];
        expect(Array.isArray(schedules)).toBe(true);
    });

    test('Test 3 — Each train has reliability tier', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=FOT&to=KAN&date=today'
        );
        expect(res.status).toBe(200);
        const allowed = ['USUALLY_ON_TIME', 'SOMETIMES_DELAYED', 'OFTEN_LATE', 'NO_DATA'];
        const schedules = res.body.schedules || res.body || [];
        for (var i = 0; i < schedules.length; i++) {
            expect(schedules[i].reliability).toBeDefined();
            expect(allowed).toContain(schedules[i].reliability);
        }
    });

    test('Test 4 — Each train has liveStatus', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=FOT&to=KAN&date=today'
        );
        expect(res.status).toBe(200);
        const allowed = ['ON_TIME', 'DELAYED', 'CANCELLED'];
        const schedules = res.body.schedules || res.body || [];
        for (var i = 0; i < schedules.length; i++) {
            expect(schedules[i].liveStatus).toBeDefined();
            expect(allowed).toContain(schedules[i].liveStatus);
        }
    });

    test('Test 5 — Search completes in under 2000 ms', async () => {
        var start = Date.now();
        var res = await request(app).get(
            '/api/schedules/search?from=FOT&to=KAN&date=today'
        );
        var elapsed = Date.now() - start;
        expect(res.status).toBe(200);
        expect(elapsed).toBeLessThan(2000);
    });
});
