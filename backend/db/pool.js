const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'ceylon_track',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20
    });

// Test query on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Database connected successfully at', res.rows[0].now);
    }
});

// Configure audit_logs user_id foreign key constraint to allow ON DELETE SET NULL
pool.query(`
    ALTER TABLE audit_logs 
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
`, (err) => {
    if (err) {
        // If audit_logs table does not exist yet, ignore safely
        if (err.code !== '42P01') {
            console.error('Failed to configure audit_logs foreign key constraint:', err.message);
        }
    } else {
        console.log('[SECURITY] Configured audit_logs foreign key constraint to ON DELETE SET NULL');
    }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
