const pool = require('../db/pool');

// Ensure table exists on first import
async function ensureLoginAttemptsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                identifier VARCHAR(255) PRIMARY KEY,
                attempts INT DEFAULT 0,
                lockout_until TIMESTAMP WITH TIME ZONE NULL,
                last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);
    } catch (err) {
        console.error('Failed to ensure login_attempts table:', err.message);
    }
}
ensureLoginAttemptsTable();

const checkLockout = async (req, res, next) => {
    const { email, employee_id, login_type } = req.body;
    
    // Normalize identifier based on login details
    let identifier = '';
    if (login_type === 'staff' && employee_id) {
        identifier = `emp_${employee_id.trim().toLowerCase()}`;
    } else if (email) {
        identifier = email.trim().toLowerCase();
    } else {
        return next(); // missing fields handled by validation / handler
    }

    try {
        const result = await pool.query(
            'SELECT attempts, lockout_until FROM login_attempts WHERE identifier = $1',
            [identifier]
        );

        if (result.rows.length > 0) {
            const { attempts, lockout_until } = result.rows[0];
            if (lockout_until && new Date(lockout_until) > new Date()) {
                const waitMs = new Date(lockout_until) - new Date();
                const waitMins = Math.ceil(waitMs / 60000);
                return res.status(423).json({
                    error: `Too many failed attempts. Account locked. Try again in ${waitMins} minute(s).`
                });
            }
        }
        next();
    } catch (err) {
        console.error('Lockout check error:', err.message);
        next(); // fail open for database errors to avoid lockout service Denial of Service
    }
};

const recordLoginSuccess = async (identifier) => {
    if (!identifier) return;
    try {
        await pool.query(
            'INSERT INTO login_attempts (identifier, attempts, lockout_until, last_attempt_at) VALUES ($1, 0, NULL, NOW()) ON CONFLICT (identifier) DO UPDATE SET attempts = 0, lockout_until = NULL, last_attempt_at = NOW()',
            [identifier.trim().toLowerCase()]
        );
    } catch (err) {
        console.error('Record login success error:', err.message);
    }
};

const recordLoginFailure = async (identifier) => {
    if (!identifier) return;
    try {
        const idNormalized = identifier.trim().toLowerCase();
        const result = await pool.query(
            'SELECT attempts FROM login_attempts WHERE identifier = $1',
            [idNormalized]
        );

        let newAttempts = 1;
        let lockoutUntil = null;

        if (result.rows.length > 0) {
            newAttempts = result.rows[0].attempts + 1;
        }

        if (newAttempts >= 5) {
            lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        }

        await pool.query(
            `INSERT INTO login_attempts (identifier, attempts, lockout_until, last_attempt_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (identifier)
             DO UPDATE SET
               attempts = EXCLUDED.attempts,
               lockout_until = EXCLUDED.lockout_until,
               last_attempt_at = NOW()`,
            [idNormalized, newAttempts, lockoutUntil]
        );
    } catch (err) {
        console.error('Record login failure error:', err.message);
    }
};

module.exports = {
    checkLockout,
    recordLoginSuccess,
    recordLoginFailure
};
