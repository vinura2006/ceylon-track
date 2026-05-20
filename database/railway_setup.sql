-- Step 1: Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Create all tables (copy from schema.sql with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger','staff','admin')),
    sub_role VARCHAR(50),
    assigned_station_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

-- update users FK now that stations exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_station') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_station FOREIGN KEY (assigned_station_id) REFERENCES stations(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    train_number VARCHAR(20) NOT NULL,
    train_name VARCHAR(150),
    from_station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    to_station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    class VARCHAR(20) NOT NULL DEFAULT 'mixed' CHECK (class IN ('1st','2nd','3rd','mixed')),
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stop_times (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    station_name VARCHAR(150) NOT NULL,
    scheduled_time TIME NOT NULL,
    stop_sequence INTEGER NOT NULL,
    platform VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS trip_status_updates (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ON_TIME' CHECK (status IN ('ON_TIME','DELAYED','CANCELLED')),
    delay_minutes INTEGER DEFAULT 0 CHECK (delay_minutes >= 0),
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    notes TEXT,
    last_stop_name VARCHAR(100),
    last_stop_time TIMESTAMP,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(schedule_id, trip_date)
);

CREATE TABLE IF NOT EXISTS journey_watches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    notify_delays BOOLEAN DEFAULT TRUE,
    notify_departure BOOLEAN DEFAULT TRUE,
    notify_cancellations BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, schedule_id)
);

CREATE TABLE IF NOT EXISTS train_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_assignment ON train_assignments(schedule_id, assignment_date) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS train_last_stops (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    station_name VARCHAR(150),
    arrived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_type VARCHAR(50),
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_manual BOOLEAN DEFAULT true,
    UNIQUE(schedule_id, trip_date)
);

CREATE TABLE IF NOT EXISTS sri_lanka_timetable (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(20) UNIQUE NOT NULL,
    train_name VARCHAR(100),
    route_name VARCHAR(100),
    start_station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    end_station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    departure_time TIME,
    arrival_time TIME,
    train_class VARCHAR(50) DEFAULT '2nd, 3rd Class',
    frequency VARCHAR(50) DEFAULT 'Daily'
);

CREATE TABLE IF NOT EXISTS timetable_stops (
    id SERIAL PRIMARY KEY,
    timetable_id INTEGER REFERENCES sri_lanka_timetable(id) ON DELETE CASCADE,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    arrival_time TIME,
    departure_time TIME,
    stop_sequence INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    timetable_id INTEGER REFERENCES sri_lanka_timetable(id) ON DELETE CASCADE,
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Redirected'
);

CREATE INDEX IF NOT EXISTS idx_schedules_from ON schedules(from_station_id);
CREATE INDEX IF NOT EXISTS idx_schedules_to ON schedules(to_station_id);
CREATE INDEX IF NOT EXISTS idx_trip_status_schedule_date ON trip_status_updates(schedule_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_journey_watches_user ON journey_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_schedule ON stop_times(schedule_id, stop_sequence);

-- Step 3: Seed only if empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stations LIMIT 1) THEN
    -- In actual environment, run seed.sql here or leave empty and let Railway dashboard handle seed script
    RAISE NOTICE 'Stations table is empty, data needs seeding.';
  ELSE
    RAISE NOTICE 'Data already exists — skipping seed';
  END IF;
END $$;
