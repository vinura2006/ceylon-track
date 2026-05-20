-- Sprint 4 Migrations: GPS Tracking, Assignments, Last Stop, Timetable

-- Enhance Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_station_id INTEGER REFERENCES stations(id);

-- Enhance trip_status_updates Table
ALTER TABLE trip_status_updates ADD COLUMN IF NOT EXISTS last_stop_name VARCHAR(100);
ALTER TABLE trip_status_updates ADD COLUMN IF NOT EXISTS last_stop_time TIMESTAMP;

-- Create train_assignments Table
CREATE TABLE IF NOT EXISTS train_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create train_last_stops Table
CREATE TABLE IF NOT EXISTS train_last_stops (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_manual BOOLEAN DEFAULT true
);

-- Create sri_lanka_timetable
CREATE TABLE IF NOT EXISTS sri_lanka_timetable (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(20) UNIQUE NOT NULL,
    train_name VARCHAR(100),
    start_station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    end_station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    departure_time TIME,
    arrival_time TIME,
    train_class VARCHAR(50) DEFAULT '2nd, 3rd Class',
    frequency VARCHAR(50) DEFAULT 'Daily'
);

-- Create timetable_stops
CREATE TABLE IF NOT EXISTS timetable_stops (
    id SERIAL PRIMARY KEY,
    timetable_id INTEGER REFERENCES sri_lanka_timetable(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    arrival_time TIME,
    departure_time TIME,
    stop_sequence INTEGER NOT NULL
);

-- Create ticket_bookings
CREATE TABLE IF NOT EXISTS ticket_bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    timetable_id INTEGER REFERENCES sri_lanka_timetable(id) ON DELETE CASCADE,
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Redirected'
);
