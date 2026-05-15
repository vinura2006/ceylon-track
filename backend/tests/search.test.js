const request = require('supertest');
const app = require('../index');

describe('Schedule search API', () => {
    test('Test 1 — Valid search Colombo Fort to Kandy (CMB→KDY, date=today)', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=CMB&to=KDY&date=today'
        );
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.schedules)).toBe(true);
        expect(res.body.schedules.length).toBeGreaterThanOrEqual(2);

        const names = res.body.schedules.map((s) => s.train.name);
        expect(names).toContain('Udarata Menike');
        expect(names).toContain('Tikiri Menike');
    });

    test('Test 2 — Invalid station code returns 404 or helpful empty response', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=INVALID&to=KDY&date=today'
        );
        if (res.status === 404) {
            expect(res.body.error).toBeDefined();
        } else {
            expect(res.status).toBe(200);
            expect(res.body.schedules).toEqual([]);
            expect(res.body.message || res.body.error).toBeDefined();
        }
    });

    test('Test 3 — Each train has reliability tier high, medium, low, or no_data', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=FOT&to=KAN&date=today'
        );
        expect(res.status).toBe(200);
        const allowed = ['high', 'medium', 'low', 'no_data'];
        for (const s of res.body.schedules || []) {
            expect(s.reliability).toBeDefined();
            expect(allowed).toContain(s.reliability.reliability);
        }
    });

    test('Test 4 — Each train has status display On Time, Delayed, or Cancelled', async () => {
        const res = await request(app).get(
            '/api/schedules/search?from=FOT&to=KAN&date=today'
        );
        expect(res.status).toBe(200);
        const allowed = ['On Time', 'Delayed', 'Cancelled'];
        for (const s of res.body.schedules || []) {
            expect(s.status).toBeDefined();
            expect(allowed).toContain(s.status.display);
        }
    });

    test('Test 5 — Search completes in under 2000 ms', async () => {
        const start = Date.now();
        const res = await request(app).get(
            '/api/schedules/search?from=CMB&to=KDY&date=today'
        );
        const elapsed = Date.now() - start;
        expect(res.status).toBe(200);
        expect(elapsed).toBeLessThan(2000);
    });
});
