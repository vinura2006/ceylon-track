-- Migration 006: Token blacklist for logout invalidation
CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-expire entries older than 7 days (matching JWT max lifetime)
-- PostgreSQL does not support TTL natively; we use a periodic cleanup approach
CREATE INDEX IF NOT EXISTS idx_token_blacklist_created ON token_blacklist(created_at);
