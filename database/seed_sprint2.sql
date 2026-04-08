-- ============================================
-- Ceylon Track Sprint 2 - Comprehensive Seed Data
-- Realistic Sri Lanka Railway Data
-- 30+ Stations, 5 Routes, 10+ Trains
-- ============================================

-- ============================================
-- 1. SEED STATIONS (32 Real Sri Lankan Stations)
-- ============================================

-- Main Line Stations
INSERT INTO Station (name, code, location, is_major) VALUES 
('Colombo Fort', 'CMB', ST_SetSRID(ST_MakePoint(79.8500, 6.9337), 4326), true),
('Maradana', 'MAR', ST_SetSRID(ST_MakePoint(79.8650, 6.9270), 4326), false),
('Ragama', 'RAG', ST_SetSRID(ST_MakePoint(79.8950, 7.0310), 4326), false),
('Gampaha', 'GAM', ST_SetSRID(ST_MakePoint(79.9980, 7.0910), 4326), true),
('Polgahawela', 'PLG', ST_SetSRID(ST_MakePoint(80.2200, 7.3350), 4326), true),
('Rambukkana', 'RKB', ST_SetSRID(ST_MakePoint(80.3950, 7.3220), 4326), false),
('Kadugannawa', 'KDG', ST_SetSRID(ST_MakePoint(80.5200, 7.2550), 4326), false),
('Peradeniya', 'PDN', ST_SetSRID(ST_MakePoint(80.5950, 7.2650), 4326), true),
('Kandy', 'KAN', ST_SetSRID(ST_MakePoint(80.6350, 7.2930), 4326), true),
('Nanu Oya', 'NOY', ST_SetSRID(ST_MakePoint(80.7050, 6.9660), 4326), true),
('Hatton', 'HAT', ST_SetSRID(ST_MakePoint(80.6000, 6.8800), 4326), true),
('Talawakele', 'TLW', ST_SetSRID(ST_MakePoint(80.6000, 6.9330), 4326), false),
('Watawala', 'WAT', ST_SetSRID(ST_MakePoint(80.5500, 6.9700), 4326), false),
('Idalgashinna', 'IDG', ST_SetSRID(ST_MakePoint(80.7800, 6.7800), 4326), false),
('Ohiya', 'OHY', ST_SetSRID(ST_MakePoint(80.8167, 6.8500), 4326), true),
('Pattipola', 'PTP', ST_SetSRID(ST_MakePoint(80.8333, 6.8833), 4326), false),
('Haputale', 'HAP', ST_SetSRID(ST_MakePoint(80.9500, 6.7650), 4326), true),
('Bandarawela', 'BDR', ST_SetSRID(ST_MakePoint(90.9830, 6.8330), 4326), true),
('Diyatalawa', 'DIY', ST_SetSRID(ST_MakePoint(80.9500, 6.8330), 4326), false),
('Badulla', 'BAD', ST_SetSRID(ST_MakePoint(81.0550, 6.9900), 4326), true);

-- Coastal Line Stations
INSERT INTO Station (name, code, location, is_major) VALUES 
('Panadura', 'PAN', ST_SetSRID(ST_MakePoint(79.9000, 6.7100), 4326), false),
('Kalutara South', 'KTS', ST_SetSRID(ST_MakePoint(79.9620, 6.5800), 4326), false),
('Aluthgama', 'ALG', ST_SetSRID(ST_MakePoint(80.0000, 6.4330), 4326), false),
('Bentota', 'BEN', ST_SetSRID(ST_MakePoint(80.0000, 6.4220), 4326), false),
('Ambalangoda', 'AMB', ST_SetSRID(ST_MakePoint(80.0500, 6.2330), 4326), false),
('Hikkaduwa', 'HIK', ST_SetSRID(ST_MakePoint(80.1000, 6.1400), 4326), false),
('Galle', 'GAL', ST_SetSRID(ST_MakePoint(80.2200, 6.0330), 4326), true),
('Unawatuna', 'UNA', ST_SetSRID(ST_MakePoint(80.2500, 6.0100), 4326), false),
('Weligama', 'WLM', ST_SetSRID(ST_MakePoint(80.4300, 5.9700), 4326), false),
('Matara', 'MAT', ST_SetSRID(ST_MakePoint(80.5500, 5.9500), 4326), true);

-- Northern Line Stations
INSERT INTO Station (name, code, location, is_major) VALUES 
('Veyangoda', 'VEY', ST_SetSRID(ST_MakePoint(79.9800, 7.1550), 4326), false),
('Mirigama', 'MRG', ST_SetSRID(ST_MakePoint(80.1300, 7.2410), 4326), false),
('Anuradhapura', 'ANP', ST_SetSRID(ST_MakePoint(80.4100, 8.3100), 4326), true),
('Vavuniya', 'VAV', ST_SetSRID(ST_MakePoint(80.5000, 8.7500), 4326), true),
('Jaffna', 'JAF', ST_SetSRID(ST_MakePoint(80.0200, 9.6600), 4326), true);

-- Puttalam Line Stations
INSERT INTO Station (name, code, location, is_major) VALUES 
('Negombo', 'NEG', ST_SetSRID(ST_MakePoint(79.8600, 7.2100), 4326), true),
('Puttalam', 'PUT', ST_SetSRID(ST_MakePoint(79.8300, 8.0300), 4326), true);

-- Kelani Valley Line Stations
INSERT INTO Station (name, code, location, is_major) VALUES 
('Polonnaruwa', 'POL', ST_SetSRID(ST_MakePoint(81.0000, 7.9500), 4326), true);

-- ============================================
-- 2. SEED ROUTES (5 Real Routes)
-- ============================================

-- Main Line: Colombo Fort to Badulla (156.5 km)
INSERT INTO Route (name, type, origin_station_id, destination_station_id, total_distance_km)
SELECT 
    'Main Line (Colombo Fort to Badulla)',
    'Intercity',
    (SELECT id FROM Station WHERE code = 'CMB'),
    (SELECT id FROM Station WHERE code = 'BAD'),
    156.5;

-- Coastal Line: Colombo Fort to Matara (160 km)
INSERT INTO Route (name, type, origin_station_id, destination_station_id, total_distance_km)
SELECT 
    'Coastal Line (Colombo Fort to Matara)',
    'Intercity',
    (SELECT id FROM Station WHERE code = 'CMB'),
    (SELECT id FROM Station WHERE code = 'MAT'),
    160.0;

-- Northern Line: Colombo Fort to Vavuniya (234 km)
INSERT INTO Route (name, type, origin_station_id, destination_station_id, total_distance_km)
SELECT 
    'Northern Line (Colombo Fort to Vavuniya)',
    'Intercity',
    (SELECT id FROM Station WHERE code = 'CMB'),
    (SELECT id FROM Station WHERE code = 'VAV'),
    234.0;

-- Puttalam Line: Colombo Fort to Puttalam (132 km)
INSERT INTO Route (name, type, origin_station_id, destination_station_id, total_distance_km)
SELECT 
    'Puttalam Line (Colombo Fort to Puttalam)',
    'Express',
    (SELECT id FROM Station WHERE code = 'CMB'),
    (SELECT id FROM Station WHERE code = 'PUT'),
    132.0;

-- Kelani Valley Line: Colombo Fort to Polonnaruwa (186 km)
INSERT INTO Route (name, type, origin_station_id, destination_station_id, total_distance_km)
SELECT 
    'Kelani Valley Line (Colombo Fort to Polonnaruwa)',
    'Express',
    (SELECT id FROM Station WHERE code = 'CMB'),
    (SELECT id FROM Station WHERE code = 'POL'),
    186.0;

-- ============================================
-- 3. SEED ROUTE STATIONS (Stop Sequences with Distances)
-- ============================================

-- Main Line Stops
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 1, 0.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'CMB';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 2, 2.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'MAR';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 3, 12.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'RAG';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 4, 20.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'GAM';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 5, 42.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'PLG';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 6, 56.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'RKB';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 7, 68.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'KDG';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 8, 76.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'PDN';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 9, 82.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'KAN';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 10, 108.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'HAT';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 11, 128.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'OHY';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 12, 138.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'HAP';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 13, 146.0 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'BDR';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 14, 156.5 FROM Route r, Station s WHERE r.name LIKE 'Main Line%' AND s.code = 'BAD';

-- Coastal Line Stops
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 1, 0.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'CMB';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 2, 25.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'PAN';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 3, 44.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'KTS';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 4, 62.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'ALG';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 5, 64.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'BEN';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 6, 84.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'AMB';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 7, 98.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'HIK';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 8, 116.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'GAL';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 9, 125.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'UNA';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 10, 138.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'WLM';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 11, 160.0 FROM Route r, Station s WHERE r.name LIKE 'Coastal Line%' AND s.code = 'MAT';

-- Northern Line Stops
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 1, 0.0 FROM Route r, Station s WHERE r.name LIKE 'Northern Line%' AND s.code = 'CMB';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 2, 16.0 FROM Route r, Station s WHERE r.name LIKE 'Northern Line%' AND s.code = 'VEY';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 3, 34.0 FROM Route r, Station s WHERE r.name LIKE 'Northern Line%' AND s.code = 'MRG';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 4, 206.0 FROM Route r, Station s WHERE r.name LIKE 'Northern Line%' AND s.code = 'ANP';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 5, 234.0 FROM Route r, Station s WHERE r.name LIKE 'Northern Line%' AND s.code = 'VAV';

-- Puttalam Line Stops
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 1, 0.0 FROM Route r, Station s WHERE r.name LIKE 'Puttalam Line%' AND s.code = 'CMB';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 2, 8.0 FROM Route r, Station s WHERE r.name LIKE 'Puttalam Line%' AND s.code = 'NEG';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 3, 132.0 FROM Route r, Station s WHERE r.name LIKE 'Puttalam Line%' AND s.code = 'PUT';

-- Kelani Valley Line Stops
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 1, 0.0 FROM Route r, Station s WHERE r.name LIKE 'Kelani Valley Line%' AND s.code = 'CMB';
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin)
SELECT r.id, s.id, 2, 186.0 FROM Route r, Station s WHERE r.name LIKE 'Kelani Valley Line%' AND s.code = 'POL';

-- ============================================
-- 4. SEED ROUTE FARES (3 Classes per Route)
-- ============================================

-- Main Line Fares (156.5 km)
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 1, 450.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Main Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 2, 250.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Main Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 3, 130.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Main Line%';

-- Coastal Line Fares (160 km)
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 1, 460.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Coastal Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 2, 255.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Coastal Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 3, 135.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Coastal Line%';

-- Northern Line Fares (234 km)
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 1, 680.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Northern Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 2, 380.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Northern Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 3, 195.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Northern Line%';

-- Puttalam Line Fares (132 km)
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 1, 380.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Puttalam Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 2, 210.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Puttalam Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 3, 110.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Puttalam Line%';

-- Kelani Valley Line Fares (186 km)
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 1, 540.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Kelani Valley Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 2, 300.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Kelani Valley Line%';
INSERT INTO RouteFare (route_id, class_type, price, effective_date)
SELECT r.id, 3, 155.00, '2024-01-01' FROM Route r WHERE r.name LIKE 'Kelani Valley Line%';

-- ============================================
-- 5. SEED TRAINS (12 Real Train Services)
-- ============================================

INSERT INTO Train (name, number, capacity, type, active) VALUES
('Udarata Menike', '1015', 350, 'Intercity', true),
('Ruhunu Kumari', '8057', 400, 'Intercity', true),
('Yal Devi', '4077', 350, 'Intercity', true),
('Rajadhani Express', '1030', 300, 'Express', true),
('Badulla Night Mail', '1045', 200, 'Express', true),
('Coastal Line Express', '8050', 380, 'Intercity', true),
('Galle Intercity', '8058', 400, 'Intercity', true),
('Northern Line Express', '4001', 350, 'Intercity', true),
('Anuradhapura Special', '4018', 300, 'Express', true),
('Puttalam Express', '6020', 280, 'Express', true),
('Kelani Valley Express', '8005', 300, 'Express', true),
('Polonnaruwa Express', '8010', 320, 'Express', true);

-- ============================================
-- 6. SEED SCHEDULES (Daily Operations)
-- ============================================

-- Udarata Menike: CMB to BAD (Main Line) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '1015'),
    (SELECT id FROM Route WHERE name LIKE 'Main Line%'),
    '2024-01-01',
    NULL,
    true;

-- Ruhunu Kumari: CMB to MAT (Coastal) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '8057'),
    (SELECT id FROM Route WHERE name LIKE 'Coastal Line%'),
    '2024-01-01',
    NULL,
    true;

-- Yal Devi: CMB to VAV (Northern) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '4077'),
    (SELECT id FROM Route WHERE name LIKE 'Northern Line%'),
    '2024-01-01',
    NULL,
    true;

-- Galle Intercity: CMB to GAL (Coastal) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '8058'),
    (SELECT id FROM Route WHERE name LIKE 'Coastal Line%'),
    '2024-01-01',
    NULL,
    true;

-- Badulla Night Mail: CMB to BAD (Main Line) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '1045'),
    (SELECT id FROM Route WHERE name LIKE 'Main Line%'),
    '2024-01-01',
    NULL,
    true;

-- Anuradhapura Special: CMB to ANP (Northern) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '4018'),
    (SELECT id FROM Route WHERE name LIKE 'Northern Line%'),
    '2024-01-01',
    NULL,
    true;

-- Puttalam Express: CMB to PUT (Puttalam Line) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '6020'),
    (SELECT id FROM Route WHERE name LIKE 'Puttalam Line%'),
    '2024-01-01',
    NULL,
    true;

-- Polonnaruwa Express: CMB to POL (Kelani Valley) - Daily
INSERT INTO Schedule (train_id, route_id, effective_start_date, effective_end_date, active)
SELECT 
    (SELECT id FROM Train WHERE number = '8010'),
    (SELECT id FROM Route WHERE name LIKE 'Kelani Valley Line%'),
    '2024-01-01',
    NULL,
    true;

-- ============================================
-- 7. SEED SCHEDULE DAYS (Weekday Operations)
-- ============================================

-- All trains run every day of the week (0=Sunday through 6=Saturday)
INSERT INTO ScheduleDays (schedule_id, day_of_week)
SELECT s.id, 0 FROM Schedule s;
INSERT INTO ScheduleDays (schedule_id, day_of_week)
SELECT s.id, 1 FROM Schedule s;
INSERT INTO ScheduleDays (schedule_id, day_of_week)
SELECT s.id, 2 FROM Schedule s;
INSERT INTO ScheduleDays (schedule_id, day_of_week)
SELECT s.id, 3 FROM Schedule s;
INSERT INTO ScheduleDays (schedule_id, day_of_week)
SELECT s.id, 4 FROM Schedule s;
INSERT INTO ScheduleDays (schedule_id, day_of_week)
SELECT s.id, 5 FROM Schedule s;
INSERT INTO ScheduleDays (schedule_id, day_of_week)
SELECT s.id, 6 FROM Schedule s;

-- ============================================
-- 8. SEED SCHEDULE STATION TIMINGS
-- ============================================

-- Udarata Menike (1015) - Main Line: CMB to BAD
-- Departs Colombo Fort 06:55, Arrives Badulla 14:45
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, stop_sequence, day_offset, stop_duration_minutes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'CMB'),
    NULL, '06:55:00', 1, 0, 5
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'MAR'),
    '07:02:00', '07:04:00', 2, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'RAG'),
    '07:20:00', '07:22:00', 3, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'GAM'),
    '07:38:00', '07:40:00', 4, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'PLG'),
    '08:15:00', '08:20:00', 5, 0, 5
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'RKB'),
    '08:40:00', '08:42:00', 6, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'PDN'),
    '09:25:00', '09:28:00', 7, 0, 3
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'KAN'),
    '09:40:00', '09:45:00', 8, 0, 5
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'HAT'),
    '11:30:00', '11:32:00', 9, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'OHY'),
    '12:30:00', '12:32:00', 10, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'HAP'),
    '13:20:00', '13:22:00', 11, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'BDR'),
    '13:50:00', '13:52:00', 12, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (SELECT id FROM Station WHERE code = 'BAD'),
    '14:45:00', NULL, 13, 0, 0;

-- Ruhunu Kumari (8057) - Coastal Line: CMB to MAT
-- Departs Colombo Fort 08:30, Arrives Matara 14:15
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, stop_sequence, day_offset, stop_duration_minutes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'CMB'),
    NULL, '08:30:00', 1, 0, 5
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'PAN'),
    '08:55:00', '08:57:00', 2, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'KTS'),
    '09:25:00', '09:27:00', 3, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'ALG'),
    '09:50:00', '09:52:00', 4, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'BEN'),
    '09:55:00', '09:57:00', 5, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'AMB'),
    '10:25:00', '10:27:00', 6, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'HIK'),
    '10:50:00', '10:52:00', 7, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'GAL'),
    '11:15:00', '11:20:00', 8, 0, 5
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'UNA'),
    '11:35:00', '11:37:00', 9, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'WLM'),
    '12:05:00', '12:07:00', 10, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (SELECT id FROM Station WHERE code = 'MAT'),
    '14:15:00', NULL, 11, 0, 0;

-- Galle Intercity (8058) - Coastal Line: CMB to GAL
-- Departs Colombo Fort 18:00, Arrives Galle 21:15
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, stop_sequence, day_offset, stop_duration_minutes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8058'),
    (SELECT id FROM Station WHERE code = 'CMB'),
    NULL, '18:00:00', 1, 0, 5
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8058'),
    (SELECT id FROM Station WHERE code = 'KTS'),
    '19:00:00', '19:02:00', 2, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8058'),
    (SELECT id FROM Station WHERE code = 'BEN'),
    '20:05:00', '20:07:00', 3, 0, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8058'),
    (SELECT id FROM Station WHERE code = 'GAL'),
    '21:15:00', NULL, 4, 0, 0;

-- Badulla Night Mail (1045) - Main Line: CMB to BAD
-- Departs Colombo Fort 20:00, Arrives Badulla 04:30 (next day)
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, stop_sequence, day_offset, stop_duration_minutes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (SELECT id FROM Station WHERE code = 'CMB'),
    NULL, '20:00:00', 1, 0, 5
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (SELECT id FROM Station WHERE code = 'GAM'),
    '20:45:00', '20:48:00', 2, 0, 3
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (SELECT id FROM Station WHERE code = 'PLG'),
    '21:45:00', '21:48:00', 3, 0, 3
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (SELECT id FROM Station WHERE code = 'KAN'),
    '23:00:00', '23:10:00', 4, 0, 10
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (SELECT id FROM Station WHERE code = 'HAT'),
    '02:00:00', '02:03:00', 5, 1, 3
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (SELECT id FROM Station WHERE code = 'HAP'),
    '03:15:00', '03:17:00', 6, 1, 2
UNION ALL SELECT
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (SELECT id FROM Station WHERE code = 'BAD'),
    '04:30:00', NULL, 7, 1, 0;

-- ============================================
-- 9. SEED USERS (Admin, Staff, Passengers)
-- ============================================

-- Admin user (password: admin123)
INSERT INTO "User" (email, password_hash, first_name, last_name, phone, role, active, email_verified)
VALUES (
    'admin@ceylontrack.lk',
    '$2b$10$YourHashedPasswordHereForAdmin',
    'System',
    'Administrator',
    '+94771234567',
    'Admin',
    true,
    true
);

-- Staff user (password: staff123)
INSERT INTO "User" (email, password_hash, first_name, last_name, phone, role, active, email_verified)
VALUES (
    'staff@ceylontrack.lk',
    '$2b$10$YourHashedPasswordHereForStaff',
    'Station',
    'Master',
    '+94771234568',
    'Staff',
    true,
    true
);

-- Sample passenger (password: passenger123)
INSERT INTO "User" (email, password_hash, first_name, last_name, phone, role, active, email_verified)
VALUES (
    'passenger@example.com',
    '$2b$10$YourHashedPasswordHereForPassenger',
    'John',
    'Perera',
    '+94771234569',
    'Passenger',
    true,
    true
);

-- ============================================
-- 10. SEED TRIP STATUS HISTORY (30 Days for Reliability Calculation)
-- ============================================

-- Generate historical status data for each train (30 days)
-- Most trains are on time (80%), some slightly delayed (15%), some delayed (5%)

-- Udarata Menike (1015) - Mostly on time
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    (CURRENT_DATE - INTERVAL '1 day' * gs)::date,
    (SELECT id FROM Station WHERE code = 'BAD'),
    CASE 
        WHEN gs < 3 THEN 'Delayed'
        WHEN gs < 7 THEN 'Delayed'
        ELSE 'On Time'
    END,
    CASE 
        WHEN gs < 3 THEN 25
        WHEN gs < 7 THEN 12
        ELSE 0
    END,
    CASE 
        WHEN gs < 3 THEN 'Track maintenance between Hatton and Haputale'
        WHEN gs < 7 THEN 'Minor signal delay at Peradeniya'
        ELSE NULL
    END
FROM generate_series(1, 30) AS gs;

-- Ruhunu Kumari (8057) - Occasionally delayed
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    (CURRENT_DATE - INTERVAL '1 day' * gs)::date,
    (SELECT id FROM Station WHERE code = 'MAT'),
    CASE 
        WHEN gs % 10 = 0 THEN 'Delayed'
        WHEN gs % 5 = 0 THEN 'Delayed'
        ELSE 'On Time'
    END,
    CASE 
        WHEN gs % 10 = 0 THEN 20
        WHEN gs % 5 = 0 THEN 8
        ELSE 0
    END,
    CASE 
        WHEN gs % 10 = 0 THEN 'Bad weather conditions in coastal area'
        WHEN gs % 5 = 0 THEN 'Passenger congestion at Galle'
        ELSE NULL
    END
FROM generate_series(1, 30) AS gs;

-- Galle Intercity (8058) - Generally reliable
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8058'),
    (CURRENT_DATE - INTERVAL '1 day' * gs)::date,
    (SELECT id FROM Station WHERE code = 'GAL'),
    CASE 
        WHEN gs % 20 = 0 THEN 'Delayed'
        WHEN gs % 15 = 0 THEN 'Delayed'
        ELSE 'On Time'
    END,
    CASE 
        WHEN gs % 20 = 0 THEN 15
        WHEN gs % 15 = 0 THEN 6
        ELSE 0
    END,
    NULL
FROM generate_series(1, 30) AS gs;

-- Badulla Night Mail (1045) - Often delayed due to mountainous terrain
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    (CURRENT_DATE - INTERVAL '1 day' * gs)::date,
    (SELECT id FROM Station WHERE code = 'BAD'),
    CASE 
        WHEN gs % 3 = 0 THEN 'Delayed'
        WHEN gs % 2 = 0 THEN 'Delayed'
        ELSE 'On Time'
    END,
    CASE 
        WHEN gs % 3 = 0 THEN 35
        WHEN gs % 2 = 0 THEN 18
        ELSE 0
    END,
    CASE 
        WHEN gs % 3 = 0 THEN 'Fog conditions in hill country'
        WHEN gs % 2 = 0 THEN 'Track restrictions on up-country line'
        ELSE NULL
    END
FROM generate_series(1, 30) AS gs;

-- Anuradhapura Special (4018) - Mostly reliable
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '4018'),
    (CURRENT_DATE - INTERVAL '1 day' * gs)::date,
    (SELECT id FROM Station WHERE code = 'ANP'),
    CASE 
        WHEN gs % 12 = 0 THEN 'Delayed'
        ELSE 'On Time'
    END,
    CASE 
        WHEN gs % 12 = 0 THEN 12
        ELSE 0
    END,
    NULL
FROM generate_series(1, 30) AS gs;

-- Add today's status for real-time demo
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1015'),
    CURRENT_DATE,
    (SELECT id FROM Station WHERE code = 'HAT'),
    'On Time',
    0,
    NULL;

INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8057'),
    CURRENT_DATE,
    (SELECT id FROM Station WHERE code = 'GAL'),
    'Delayed',
    12,
    'Minor delay due to passenger boarding at Galle';

INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '8058'),
    CURRENT_DATE,
    (SELECT id FROM Station WHERE code = 'BEN'),
    'On Time',
    0,
    NULL;

INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, notes)
SELECT 
    (SELECT s.id FROM Schedule s JOIN Train t ON s.train_id = t.id WHERE t.number = '1045'),
    CURRENT_DATE,
    (SELECT id FROM Station WHERE code = 'PLG'),
    'Delayed',
    28,
    'Fog conditions in up-country area affecting night train';

-- ============================================
-- END OF COMPREHENSIVE SEED DATA
-- ============================================
