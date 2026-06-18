-- ============================================================
-- Ceylon Track — Performance Indexes
-- Idempotent: safe to run multiple times.
-- Run after app_tables_migration.sql.
-- ============================================================

-- Case-insensitive station code (fixes slow ILIKE in schedule search)
CREATE INDEX IF NOT EXISTS idx_stations_code_lower
    ON stations (LOWER(code));

-- Email lookup for login
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users (email);

-- Employee ID lookup for staff login
CREATE INDEX IF NOT EXISTS idx_users_employee_id
    ON users (employee_id)
    WHERE employee_id IS NOT NULL;

-- Journey watches — notification checker query
CREATE INDEX IF NOT EXISTS idx_journey_watches_notify
    ON JourneyWatch (watch_date, notify_delays)
    WHERE notify_delays = TRUE;

-- Trip status updates — date + status filter (stats endpoint, disruptions)
CREATE INDEX IF NOT EXISTS idx_trip_status_date_status
    ON trip_status_updates (trip_date, status);

-- GPS live map — active trains with coordinates
CREATE INDEX IF NOT EXISTS idx_trip_status_gps
    ON trip_status_updates (trip_date, updated_at)
    WHERE current_lat IS NOT NULL AND current_lng IS NOT NULL;

SELECT 'Performance indexes applied successfully.' AS result;
