-- Incremental migration script to add MFA fields to the users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
