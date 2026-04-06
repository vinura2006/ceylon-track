-- ============================================
-- Ceylon Track - Database Schema
-- PostgreSQL with PostGIS Extension
-- Sprint 1 MVP - 3NF Normalized Schema
-- ============================================

-- Create database (run this manually as postgres user)
-- CREATE DATABASE ceylontrack;

-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. Station Table
-- Stores railway station information with geographic location
-- ============================================
CREATE TABLE Station (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    location GEOGRAPHY(POINT, 4326),
    is_major BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_station_location ON Station USING GIST(location);
CREATE INDEX idx_station_code ON Station(code);

-- ============================================
-- 2. Route Table
-- Defines train routes (Express/Local/Intercity)
-- ============================================
CREATE TABLE Route (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Express', 'Local', 'Intercity')),
    origin_station_id INTEGER REFERENCES Station(id),
    destination_station_id INTEGER REFERENCES Station(id),
    total_distance_km DECIMAL(8, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_route_type ON Route(type);

-- ============================================
-- 3. RouteStation Table
-- Junction table mapping routes to stations with stop sequence
-- ============================================
CREATE TABLE RouteStation (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES Route(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES Station(id) ON DELETE CASCADE,
    stop_sequence INTEGER NOT NULL,
    distance_from_origin DECIMAL(8, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, station_id),
    UNIQUE(route_id, stop_sequence)
);

CREATE INDEX idx_routestation_route ON RouteStation(route_id);
CREATE INDEX idx_routestation_station ON RouteStation(station_id);

-- ============================================
-- 4. RouteFare Table
-- Stores fare information for different classes per route
-- ============================================
CREATE TABLE RouteFare (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES Route(id) ON DELETE CASCADE,
    class_type INTEGER NOT NULL CHECK (class_type IN (1, 2, 3)),
    price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, class_type, effective_date)
);

CREATE INDEX idx_routefare_route ON RouteFare(route_id);

-- ============================================
-- 5. Train Table
-- Stores train fleet information
-- ============================================
CREATE TABLE Train (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    number VARCHAR(20) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    type VARCHAR(20) CHECK (type IN ('Diesel', 'Intercity', 'Commuter')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_train_number ON Train(number);

-- ============================================
-- 6. Schedule Table
-- Template mapping trains to routes with timing
-- ============================================
CREATE TABLE Schedule (
    id SERIAL PRIMARY KEY,
    train_id INTEGER NOT NULL REFERENCES Train(id),
    route_id INTEGER NOT NULL REFERENCES Route(id),
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedule_train ON Schedule(train_id);
CREATE INDEX idx_schedule_route ON Schedule(route_id);
CREATE INDEX idx_schedule_active ON Schedule(active);

-- ============================================
-- 7. ScheduleDays Table
-- Maps schedules to days of the week (0=Sunday, 6=Saturday)
-- ============================================
CREATE TABLE ScheduleDays (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES Schedule(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, day_of_week)
);

CREATE INDEX idx_scheduledays_schedule ON ScheduleDays(schedule_id);

-- ============================================
-- 8. ScheduleStationTiming Table
-- Arrival/departure times for each station in a schedule
-- ============================================
CREATE TABLE ScheduleStationTiming (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES Schedule(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES Station(id),
    arrival_time TIME,
    departure_time TIME,
    day_offset INTEGER DEFAULT 0,
    stop_sequence INTEGER NOT NULL,
    stop_duration_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, station_id),
    UNIQUE(schedule_id, stop_sequence)
);

CREATE INDEX idx_scheduletiming_schedule ON ScheduleStationTiming(schedule_id);
CREATE INDEX idx_scheduletiming_station ON ScheduleStationTiming(station_id);

-- ============================================
-- 9. TripStatusUpdate Table
-- Real-time tracking and status updates
-- ============================================
CREATE TABLE TripStatusUpdate (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES Schedule(id),
    trip_date DATE NOT NULL,
    current_station_id INTEGER REFERENCES Station(id),
    status VARCHAR(20) NOT NULL DEFAULT 'On Time' 
        CHECK (status IN ('On Time', 'Delayed', 'Cancelled', 'Completed', 'Not Started')),
    delay_minutes INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, trip_date)
);

CREATE INDEX idx_tripstatus_schedule ON TripStatusUpdate(schedule_id);
CREATE INDEX idx_tripstatus_date ON TripStatusUpdate(trip_date);
CREATE INDEX idx_tripstatus_status ON TripStatusUpdate(status);

-- ============================================
-- 10. User Table
-- User accounts for passengers, staff, and admins
-- ============================================
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'Passenger' 
        CHECK (role IN ('Passenger', 'Staff', 'Admin')),
    active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_role ON "User"(role);

-- ============================================
-- 11. JourneyWatch Table
-- User subscriptions to schedule alerts
-- ============================================
CREATE TABLE JourneyWatch (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES Schedule(id) ON DELETE CASCADE,
    from_station_id INTEGER NOT NULL REFERENCES Station(id),
    to_station_id INTEGER NOT NULL REFERENCES Station(id),
    watch_date DATE,
    watch_days VARCHAR(20), -- JSON array or comma-separated days
    notify_before_minutes INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, schedule_id, watch_date)
);

CREATE INDEX idx_journeywatch_user ON JourneyWatch(user_id);
CREATE INDEX idx_journeywatch_schedule ON JourneyWatch(schedule_id);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to calculate duration between two times
CREATE OR REPLACE FUNCTION calculate_duration(
    start_time TIME,
    end_time TIME,
    start_offset INTEGER DEFAULT 0,
    end_offset INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        (EXTRACT(EPOCH FROM end_time) / 60 + end_offset * 1440)::INTEGER - 
        (EXTRACT(EPOCH FROM start_time) / 60 + start_offset * 1440)::INTEGER
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_station_updated_at BEFORE UPDATE ON Station
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
