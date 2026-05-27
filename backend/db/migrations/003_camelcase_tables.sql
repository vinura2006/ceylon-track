-- Migration 003: Create CamelCase tables for admin.js compatibility
-- Both naming conventions must coexist — do NOT drop snake_case tables

CREATE TABLE IF NOT EXISTS "Train" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  "number" VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(30),
  capacity INTEGER,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Route" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Station" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  location GEOGRAPHY(POINT,4326),
  is_major BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Schedule" (
  id SERIAL PRIMARY KEY,
  train_id INTEGER REFERENCES "Train"(id),
  route_id INTEGER REFERENCES "Route"(id),
  effective_start_date DATE,
  effective_end_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ScheduleDays" (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES "Schedule"(id) ON DELETE CASCADE,
  day_of_week INTEGER
);

CREATE TABLE IF NOT EXISTS "ScheduleStationTiming" (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES "Schedule"(id) ON DELETE CASCADE,
  station_id INTEGER REFERENCES "Station"(id),
  arrival_time TIME,
  departure_time TIME,
  stop_sequence INTEGER,
  day_offset INTEGER DEFAULT 0,
  stop_duration_minutes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "User" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'passenger',
  sub_role VARCHAR(20),
  home_station_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "JourneyWatch" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  schedule_id INTEGER,
  from_station_id INTEGER,
  to_station_id INTEGER,
  watch_date DATE,
  active BOOLEAN DEFAULT TRUE,
  notify_delays BOOLEAN DEFAULT TRUE,
  notify_departure BOOLEAN DEFAULT TRUE,
  notify_cancellations BOOLEAN DEFAULT TRUE,
  last_alert_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "TripStatusUpdate" (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER,
  trip_date DATE,
  current_station_id INTEGER,
  status VARCHAR(20) DEFAULT 'On Time',
  delay_minutes INTEGER DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  last_stop_name VARCHAR(100),
  last_stop_time TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  updated_by INTEGER,
  gps_source VARCHAR(20) DEFAULT 'manual',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert seed data into CamelCase tables from snake_case tables (if they exist)
-- This ensures admin.js has data to work with
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stations') THEN
    INSERT INTO "Station" (name, code, location, is_major)
    SELECT s.name, s.code, s.location, TRUE
    FROM stations s
    WHERE NOT EXISTS (SELECT 1 FROM "Station" WHERE code = s.code);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stations') THEN
    INSERT INTO "Train" (name, "number", type, active)
    SELECT DISTINCT s.train_name, s.train_number, 'Express', TRUE
    FROM schedules s
    WHERE s.train_name IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "Train" WHERE "number" = s.train_number);

    INSERT INTO "Route" (name, type)
    SELECT DISTINCT
      (SELECT dep.name || ' - ' || arr.name
       FROM stations dep, stations arr
       WHERE dep.id = s.from_station_id AND arr.id = s.to_station_id),
      'Main'
    FROM schedules s
    WHERE NOT EXISTS (
      SELECT 1 FROM "Route" WHERE name = (
        SELECT dep.name || ' - ' || arr.name
        FROM stations dep, stations arr
        WHERE dep.id = s.from_station_id AND arr.id = s.to_station_id
      )
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    INSERT INTO "User" (email, password_hash, name, role, sub_role, home_station_id)
    SELECT u.email, u.password_hash, u.first_name || ' ' || u.last_name, u.role, u.sub_role, u.home_station_id
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = u.email);
  END IF;
END $$;
