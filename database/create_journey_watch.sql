-- ============================================
-- JourneyWatch table creation
-- Run this if the table does not already exist.
-- The schema.sql already defines JourneyWatch, but this file
-- acts as a safe standalone migration.
-- ============================================
CREATE TABLE IF NOT EXISTS JourneyWatch (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES Schedule(id) ON DELETE CASCADE,
    from_station_id INTEGER REFERENCES Station(id),
    to_station_id INTEGER REFERENCES Station(id),
    watch_date DATE,
    watch_days VARCHAR(20),
    notify_before_minutes INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, schedule_id, watch_date)
);

CREATE INDEX IF NOT EXISTS idx_journeywatch_user     ON JourneyWatch(user_id);
CREATE INDEX IF NOT EXISTS idx_journeywatch_schedule ON JourneyWatch(schedule_id);
