-- Migration 005: Role system overhaul + Live train sessions

-- Add new columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'dark-navy';
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Drop old role check constraint and add new one with ceylon-track-admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'ceylon-track-admin' WHERE role = 'admin';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('passenger','staff','ceylon-track-admin'));

-- Create live_train_sessions table
CREATE TABLE IF NOT EXISTS live_train_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id INTEGER REFERENCES schedules(id),
  staff_id INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  last_latitude DOUBLE PRECISION,
  last_longitude DOUBLE PRECISION,
  last_accuracy DOUBLE PRECISION,
  last_speed DOUBLE PRECISION,
  last_heading DOUBLE PRECISION,
  last_updated_at TIMESTAMPTZ,
  session_started_at TIMESTAMPTZ DEFAULT NOW(),
  session_ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_active ON live_train_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_live_sessions_schedule ON live_train_sessions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_staff ON live_train_sessions(staff_id);

-- Seed first ceylon-track-admin
INSERT INTO users (email, password_hash, first_name, last_name, role, status, theme_preference)
SELECT 'admin@ceylon.lk',
       '$2a$10$A2aFNPQLPbHPswen0yeYO.x8LgKVGzlb2QRabkHNjd.gGvruTx8T.',
       'System',
       'Admin',
       'ceylon-track-admin',
       'active',
       'dark-navy'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@ceylon.lk');
