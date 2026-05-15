const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const appPool = require('../db/pool');

/**
 * Creates a PostgreSQL pool for tests.
 * Uses TEST_DB_NAME when set; otherwise the same database as the app (DB_NAME).
 *
 * Note: Express routes use the shared `db/pool` module, so per-test transaction
 * rollback cannot wrap HTTP requests unless the app is refactored to accept a
 * custom pool. When no separate test database exists, tests rely on unique
 * data (e.g. timestamped emails) and real DB state — use TEST_DB_NAME for
 * full isolation when available.
 */
function createTestPool() {
    const database =
        process.env.TEST_DB_NAME ||
        process.env.DB_NAME ||
        'ceylontrack';

    return new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
}

/**
 * Runs `fn(client)` inside BEGIN/ROLLBACK on a dedicated client.
 * Useful only for tests that query through this same client (not Supertest).
 */
async function withTestTransaction(fn) {
    const pool = createTestPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await fn(client);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        await pool.end();
    }
}

beforeAll(async () => {
    if (!process.env.GPS_DEVICE_TOKEN) {
        process.env.GPS_DEVICE_TOKEN = 'jest-gps-device-token';
    }
    try {
        await appPool.query(
            `SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX(id) FROM "User"), 1))`
        );
    } catch (e) {
        // ignore if table missing
    }
});

afterAll(async () => {
    await appPool.end();
});

module.exports = { createTestPool, withTestTransaction };
