-- ============================================================
-- Ceylon Track — Application Tables Migration
-- Idempotent: safe to run multiple times on same database.
-- Run ONCE after schema.sql before starting the application.
-- ============================================================

-- Refresh tokens (used by /api/auth/refresh)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked    BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
    ON refresh_tokens (token_hash) WHERE revoked = false;

-- Token blacklist (stores hashes of revoked access tokens)
CREATE TABLE IF NOT EXISTS token_blacklist (
    id         SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash
    ON token_blacklist (token_hash);

-- Login attempts (brute-force / lockout tracking)
CREATE TABLE IF NOT EXISTS login_attempts (
    identifier      VARCHAR(255) PRIMARY KEY,
    attempts        INT DEFAULT 0,
    lockout_until   TIMESTAMP WITH TIME ZONE NULL,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier
    ON login_attempts (identifier);

-- Audit logs (all significant user/admin actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INTEGER,
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
    ADD CONSTRAINT audit_logs_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Live train sessions (GPS sessions started by staff)
CREATE TABLE IF NOT EXISTS live_train_sessions (
    id               SERIAL PRIMARY KEY,
    schedule_id      INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    staff_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_latitude    DECIMAL(10, 8),
    last_longitude   DECIMAL(11, 8),
    last_accuracy    REAL,
    last_speed       REAL,
    last_heading     REAL,
    last_updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_ended_at   TIMESTAMP WITH TIME ZONE,
    is_active        BOOLEAN DEFAULT TRUE
);

-- Reliability cache (populated by background job every 10 min)
CREATE TABLE IF NOT EXISTS schedule_reliability_cache (
    schedule_id         INTEGER PRIMARY KEY REFERENCES schedules(id) ON DELETE CASCADE,
    reliability_percent INTEGER NOT NULL DEFAULT 100,
    total_records       INTEGER NOT NULL DEFAULT 0,
    avg_delay_minutes   INTEGER NOT NULL DEFAULT 0,
    last_computed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'Application tables migration completed successfully.' AS result;
