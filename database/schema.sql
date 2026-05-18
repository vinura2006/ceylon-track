-- ============================================
-- Ceylon Track - Database Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS journey_watches CASCADE;
DROP TABLE IF EXISTS trip_status_updates CASCADE;
DROP TABLE IF EXISTS stop_times CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- TABLE: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger','staff','admin')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: stations
CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: schedules
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    train_number VARCHAR(20) NOT NULL,
    train_name VARCHAR(150),
    from_station_id INTEGER REFERENCES stations(id),
    to_station_id INTEGER REFERENCES stations(id),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    class VARCHAR(20) NOT NULL DEFAULT 'mixed' CHECK (class IN ('1st','2nd','3rd','mixed')),
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: stop_times
CREATE TABLE stop_times (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES stations(id),
    station_name VARCHAR(150) NOT NULL,
    scheduled_time TIME NOT NULL,
    stop_sequence INTEGER NOT NULL,
    platform VARCHAR(10)
);

-- TABLE: trip_status_updates
CREATE TABLE trip_status_updates (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id),
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ON_TIME' CHECK (status IN ('ON_TIME','DELAYED','CANCELLED')),
    delay_minutes INTEGER DEFAULT 0 CHECK (delay_minutes >= 0),
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    notes TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(schedule_id, trip_date)
);

-- TABLE: journey_watches
CREATE TABLE journey_watches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, schedule_id)
);

-- Performance Indexes
CREATE INDEX idx_schedules_from ON schedules(from_station_id);
CREATE INDEX idx_schedules_to ON schedules(to_station_id);
CREATE INDEX idx_trip_status_schedule_date ON trip_status_updates(schedule_id, trip_date);
CREATE INDEX idx_journey_watches_user ON journey_watches(user_id);
CREATE INDEX idx_stop_times_schedule ON stop_times(schedule_id, stop_sequence);
