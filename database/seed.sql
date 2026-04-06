-- ============================================
-- Ceylon Track - Seed Data
-- Real Sri Lankan Railway Data
-- ============================================

-- Clear all existing data and reset sequences
TRUNCATE TABLE "User", JourneyWatch, TripStatusUpdate, ScheduleStationTiming, ScheduleDays, Schedule, Train, RouteFare, RouteStation, Route, Station RESTART IDENTITY CASCADE;

-- ============================================
-- 1. Stations (5 Real Sri Lankan Stations)
-- ============================================
INSERT INTO Station (id, name, code, location, is_major) VALUES
    (1, 'Colombo Fort', 'FOT', ST_SetSRID(ST_MakePoint(79.8489, 6.9344), 4326), TRUE),
    (2, 'Kandy', 'KAN', ST_SetSRID(ST_MakePoint(80.6350, 7.2906), 4326), TRUE),
    (3, 'Galle', 'GAL', ST_SetSRID(ST_MakePoint(80.2200, 6.0320), 4326), TRUE),
    (4, 'Anuradhapura', 'ANU', ST_SetSRID(ST_MakePoint(80.4000, 8.3000), 4326), TRUE),
    (5, 'Jaffna', 'JAF', ST_SetSRID(ST_MakePoint(80.0000, 9.6700), 4326), TRUE);

-- ============================================
-- 2. Routes
-- ============================================
INSERT INTO Route (id, name, type, origin_station_id, destination_station_id, total_distance_km) VALUES
    (1, 'Main Line - Colombo to Kandy', 'Intercity', 1, 2, 120.00),
    (2, 'Coastal Line - Colombo to Galle', 'Intercity', 1, 3, 115.00),
    (3, 'Northern Line - Colombo to Anuradhapura', 'Intercity', 1, 4, 205.00);

-- Route Stations with stop sequence
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin) VALUES
    (1, 1, 1, 0.00),
    (1, 2, 2, 120.00),
    (2, 1, 1, 0.00),
    (2, 3, 2, 115.00),
    (3, 1, 1, 0.00),
    (3, 4, 2, 205.00);

-- Route Fares for all classes
INSERT INTO RouteFare (route_id, class_type, price, effective_date) VALUES
    (1, 1, 580.00, '2024-01-01'),
    (1, 2, 320.00, '2024-01-01'),
    (1, 3, 180.00, '2024-01-01'),
    (2, 1, 550.00, '2024-01-01'),
    (2, 2, 300.00, '2024-01-01'),
    (2, 3, 165.00, '2024-01-01'),
    (3, 1, 980.00, '2024-01-01'),
    (3, 2, 540.00, '2024-01-01'),
    (3, 3, 300.00, '2024-01-01');

-- Additional Routes for variety


-- ============================================
-- 3. Trains (3 Trains)
-- ============================================
INSERT INTO Train (id, name, number, capacity, type, active) VALUES
    (1, 'Udarata Menike', '1015', 800, 'Intercity', TRUE),
    (2, 'Ruhunu Kumari', '8057', 600, 'Intercity', TRUE),
    (3, 'Yal Devi', '4077', 750, 'Intercity', TRUE);

-- ============================================
-- 4. Schedules (Monday-Friday for each train)
-- ============================================

-- Udarata Menike: Colombo to Kandy, Mon-Fri
INSERT INTO Schedule (id, train_id, route_id, effective_start_date, effective_end_date, active) VALUES
    (1, 1, 1, '2024-01-01', NULL, TRUE);

-- Ruhunu Kumari: Colombo to Galle, Mon-Fri
INSERT INTO Schedule (id, train_id, route_id, effective_start_date, effective_end_date, active) VALUES
    (2, 2, 2, '2024-01-01', NULL, TRUE);

-- Yal Devi: Colombo to Anuradhapura, Mon-Fri
INSERT INTO Schedule (id, train_id, route_id, effective_start_date, effective_end_date, active) VALUES
    (3, 3, 3, '2024-01-01', NULL, TRUE);

-- Schedule Days (1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday)
INSERT INTO ScheduleDays (schedule_id, day_of_week) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),  -- Udarata Menike
    (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),  -- Ruhunu Kumari
    (3, 1), (3, 2), (3, 3), (3, 4), (3, 5);  -- Yal Devi

-- ============================================
-- 5. Schedule Station Timings
-- ============================================

-- Udarata Menike (1015): Departs FOT 07:00, Arrives KAN 09:45
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (1, 1, NULL, '07:00:00', 0, 1, 5),
    (1, 2, '09:45:00', NULL, 0, 2, 5);

-- Ruhunu Kumari (8057): Departs FOT 08:30, Arrives GAL 11:15
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (2, 1, NULL, '08:30:00', 0, 1, 5),
    (2, 3, '11:15:00', NULL, 0, 2, 5);

-- Yal Devi (4077): Departs FOT 06:15, Arrives ANU 10:45
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (3, 1, NULL, '06:15:00', 0, 1, 5),
    (3, 4, '10:45:00', NULL, 0, 2, 5);

-- ============================================
-- 6. Trip Status Updates (Sample real-time data)
-- ============================================
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, last_updated, notes) VALUES
    (1, CURRENT_DATE, 2, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Arrived on time'),
    (2, CURRENT_DATE, 3, 'On Time', 0, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'Running smoothly'),
    (3, CURRENT_DATE, 4, 'Delayed', 15, CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'Signal issue at Vavuniya');

-- ============================================
-- 7. Sample Users (with bcrypt hashed passwords: 'password123')
-- Hash generated with bcrypt, 10 rounds
-- ============================================
-- Password for all sample users: 'password123'
-- Hashed with bcrypt: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT INTO "User" (id, email, password_hash, first_name, last_name, phone, role, active, email_verified) VALUES
    (1, 'admin@ceylontrack.lk', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', '+94761234567', 'Admin', TRUE, TRUE),
    (2, 'staff@ceylontrack.lk', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Station', 'Master', '+94769876543', 'Staff', TRUE, TRUE),
    (3, 'passenger@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Passenger', '+94771234567', 'Passenger', TRUE, TRUE);

-- ============================================
-- 8. Sample Journey Watches
-- ============================================
INSERT INTO JourneyWatch (user_id, schedule_id, from_station_id, to_station_id, watch_date, notify_before_minutes, active) VALUES
    (3, 1, 1, 2, CURRENT_DATE + INTERVAL '1 day', 30, TRUE),
    (3, 2, 1, 3, NULL, 45, TRUE);
