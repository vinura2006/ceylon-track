-- Migration 004: Audit logs and performance indexes

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_trip_status_schedule_date ON trip_status_updates(schedule_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_trip_status_updated ON trip_status_updates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stop_times_schedule ON stop_times(schedule_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_station ON stop_times(station_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_sub_role ON users(sub_role);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON train_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_schedule ON train_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
