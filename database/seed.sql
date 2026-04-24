-- ============================================
-- Ceylon Track - Seed Data
-- Real Sri Lankan Railway Data - Expanded
-- ============================================

-- Clear all existing data and reset sequences
TRUNCATE TABLE "User", JourneyWatch, TripStatusUpdate, ScheduleStationTiming, ScheduleDays, Schedule, Train, RouteFare, RouteStation, Route, Station RESTART IDENTITY CASCADE;

-- ============================================
-- 1. Stations (55 Real Sri Lankan Stations)
-- ============================================
INSERT INTO Station (id, name, code, location, is_major) VALUES
    -- Main Line (Colombo to Badulla)
    (1, 'Colombo Fort', 'FOT', ST_SetSRID(ST_MakePoint(79.8489, 6.9344), 4326), TRUE),
    (2, 'Maradana', 'MAD', ST_SetSRID(ST_MakePoint(79.8656, 6.9296), 4326), FALSE),
    (3, 'Ragama', 'RAG', ST_SetSRID(ST_MakePoint(79.8925, 7.0311), 4326), FALSE),
    (4, 'Gampaha', 'GAM', ST_SetSRID(ST_MakePoint(79.9936, 7.0891), 4326), TRUE),
    (5, 'Veyangoda', 'VEY', ST_SetSRID(ST_MakePoint(80.0586, 7.1550), 4326), FALSE),
    (6, 'Mirigama', 'MRI', ST_SetSRID(ST_MakePoint(80.1164, 7.2414), 4326), FALSE),
    (7, 'Polgahawela', 'PLG', ST_SetSRID(ST_MakePoint(80.2653, 7.3350), 4326), TRUE),
    (8, 'Rambukkana', 'RBK', ST_SetSRID(ST_MakePoint(80.3831, 7.3258), 4326), FALSE),
    (9, 'Kadugannawa', 'KDG', ST_SetSRID(ST_MakePoint(80.5136, 7.2550), 4326), FALSE),
    (10, 'Kandy', 'KAN', ST_SetSRID(ST_MakePoint(80.6350, 7.2906), 4326), TRUE),
    (11, 'Gampola', 'GPL', ST_SetSRID(ST_MakePoint(80.5764, 7.1644), 4326), TRUE),
    (12, 'Nawalapitiya', 'NWP', ST_SetSRID(ST_MakePoint(80.3914, 7.0431), 4326), TRUE),
    (13, 'Hatton', 'HAT', ST_SetSRID(ST_MakePoint(80.6000, 6.8936), 4326), TRUE),
    (14, 'Talawakele', 'TLW', ST_SetSRID(ST_MakePoint(80.6536, 6.9325), 4326), FALSE),
    (15, 'Nanu Oya', 'NOA', ST_SetSRID(ST_MakePoint(80.7700, 6.9700), 4326), TRUE),
    (16, 'Nuwara Eliya', 'NUW', ST_SetSRID(ST_MakePoint(80.7833, 6.9667), 4326), TRUE),
    (17, 'Ohiya', 'OHY', ST_SetSRID(ST_MakePoint(80.8536, 6.8233), 4326), FALSE),
    (18, 'Haputale', 'HPT', ST_SetSRID(ST_MakePoint(80.9514, 6.7656), 4326), TRUE),
    (19, 'Diyatalawa', 'DYA', ST_SetSRID(ST_MakePoint(80.9917, 6.8000), 4326), TRUE),
    (20, 'Bandarawela', 'BDA', ST_SetSRID(ST_MakePoint(81.0025, 6.8386), 4326), TRUE),
    (21, 'Ella', 'ELL', ST_SetSRID(ST_MakePoint(81.0406, 6.8758), 4326), TRUE),
    (22, 'Badulla', 'BAD', ST_SetSRID(ST_MakePoint(81.0556, 6.9894), 4326), TRUE),

    -- Coast Line (Colombo to Galle/Matara)
    (23, 'Slave Island', 'SLI', ST_SetSRID(ST_MakePoint(79.8483, 6.9181), 4326), FALSE),
    (24, 'Kollupitiya', 'KOL', ST_SetSRID(ST_MakePoint(79.8600, 6.9100), 4326), FALSE),
    (25, 'Bambalapitiya', 'BAM', ST_SetSRID(ST_MakePoint(79.8667, 6.9000), 4326), FALSE),
    (26, 'Wellawatte', 'WEL', ST_SetSRID(ST_MakePoint(79.8667, 6.8833), 4326), FALSE),
    (27, 'Dehiwala', 'DEH', ST_SetSRID(ST_MakePoint(79.8689, 6.8564), 4326), TRUE),
    (28, 'Mount Lavinia', 'MLV', ST_SetSRID(ST_MakePoint(79.8667, 6.8333), 4326), TRUE),
    (29, 'Moratuwa', 'MOR', ST_SetSRID(ST_MakePoint(79.8806, 6.8000), 4326), TRUE),
    (30, 'Panadura', 'PAN', ST_SetSRID(ST_MakePoint(79.9072, 6.7139), 4326), TRUE),
    (31, 'Kalutara South', 'KTS', ST_SetSRID(ST_MakePoint(79.9653, 6.5853), 4326), TRUE),
    (32, 'Kalutara North', 'KTN', ST_SetSRID(ST_MakePoint(79.9653, 6.5853), 4326), FALSE),
    (33, 'Aluthgama', 'ALG', ST_SetSRID(ST_MakePoint(80.0931, 6.4336), 4326), TRUE),
    (34, 'Bentota', 'BEN', ST_SetSRID(ST_MakePoint(80.0000, 6.4250), 4326), TRUE),
    (35, 'Ambalangoda', 'AMB', ST_SetSRID(ST_MakePoint(80.0533, 6.2364), 4326), TRUE),
    (36, 'Hikkaduwa', 'HIK', ST_SetSRID(ST_MakePoint(80.1022, 6.1406), 4326), TRUE),
    (37, 'Galle', 'GAL', ST_SetSRID(ST_MakePoint(80.2200, 6.0320), 4326), TRUE),
    (38, 'Unawatuna', 'UNA', ST_SetSRID(ST_MakePoint(80.2500, 6.0167), 4326), FALSE),
    (39, 'Thalpe', 'THA', ST_SetSRID(ST_MakePoint(80.2833, 6.0000), 4326), FALSE),
    (40, 'Weligama', 'WLM', ST_SetSRID(ST_MakePoint(80.4333, 5.9667), 4326), TRUE),
    (41, 'Matara', 'MAT', ST_SetSRID(ST_MakePoint(80.5500, 5.9500), 4326), TRUE),
    (42, 'Beliatta', 'BEL', ST_SetSRID(ST_MakePoint(80.7333, 5.9833), 4326), TRUE),

    -- Northern Line (Colombo to Jaffna)
    (43, 'Kurunegala', 'KUR', ST_SetSRID(ST_MakePoint(80.3667, 7.4833), 4326), TRUE),
    (44, 'Maho', 'MAH', ST_SetSRID(ST_MakePoint(80.2833, 7.8167), 4326), TRUE),
    (45, 'Anuradhapura', 'ANU', ST_SetSRID(ST_MakePoint(80.4000, 8.3000), 4326), TRUE),
    (46, 'Medawachchiya', 'MED', ST_SetSRID(ST_MakePoint(80.5000, 8.5167), 4326), TRUE),
    (47, 'Vavuniya', 'VAV', ST_SetSRID(ST_MakePoint(80.5000, 8.7500), 4326), TRUE),
    (48, 'Kilinochchi', 'KIL', ST_SetSRID(ST_MakePoint(80.4000, 9.4000), 4326), TRUE),
    (49, 'Jaffna', 'JAF', ST_SetSRID(ST_MakePoint(80.0000, 9.6700), 4326), TRUE),
    (50, 'Kankesanthurai', 'KNK', ST_SetSRID(ST_MakePoint(79.9833, 9.8167), 4326), TRUE),

    -- Batticaloa Line
    (51, 'Polonnaruwa', 'POL', ST_SetSRID(ST_MakePoint(81.0000, 7.9333), 4326), TRUE),
    (52, 'Hingurakgoda', 'HGD', ST_SetSRID(ST_MakePoint(80.9167, 8.0833), 4326), FALSE),
    (53, 'Medirigiriya', 'MDG', ST_SetSRID(ST_MakePoint(80.8667, 8.1500), 4326), FALSE),
    (54, 'Lankapura', 'LNK', ST_SetSRID(ST_MakePoint(81.1333, 8.3167), 4326), FALSE),
    (55, 'Batticaloa', 'BAT', ST_SetSRID(ST_MakePoint(81.7000, 7.7167), 4326), TRUE),

    -- Trincomalee Line
    (56, 'Habarana', 'HAB', ST_SetSRID(ST_MakePoint(80.9500, 8.0500), 4326), TRUE),
    (57, 'Gal Oya', 'GOY', ST_SetSRID(ST_MakePoint(81.4167, 8.8333), 4326), FALSE),
    (58, 'Trincomalee', 'TRI', ST_SetSRID(ST_MakePoint(81.2333, 8.5667), 4326), TRUE),

    -- Mannar Line
    (59, 'Cheddikulam', 'CHE', ST_SetSRID(ST_MakePoint(80.2833, 8.8500), 4326), FALSE),
    (60, 'Mannar', 'MAN', ST_SetSRID(ST_MakePoint(79.9000, 8.9833), 4326), TRUE),
    (61, 'Talaimannar', 'TAL', ST_SetSRID(ST_MakePoint(79.7333, 9.1000), 4326), TRUE);

-- ============================================
-- 2. Routes (All Major Lines)
-- ============================================
INSERT INTO Route (id, name, type, origin_station_id, destination_station_id, total_distance_km) VALUES
    -- Main Line Routes
    (1, 'Colombo Fort - Kandy', 'Intercity', 1, 10, 120.00),
    (2, 'Colombo Fort - Badulla', 'Express', 1, 22, 290.00),
    (3, 'Kandy - Badulla', 'Express', 10, 22, 170.00),
    (4, 'Colombo Fort - Nawalapitiya', 'Local', 1, 12, 140.00),

    -- Coast Line Routes
    (5, 'Colombo Fort - Galle', 'Intercity', 1, 37, 115.00),
    (6, 'Colombo Fort - Matara', 'Intercity', 1, 41, 160.00),
    (7, 'Galle - Matara', 'Local', 37, 41, 45.00),
    (8, 'Colombo Fort - Beliatta', 'Express', 1, 42, 195.00),

    -- Northern Line Routes
    (9, 'Colombo Fort - Anuradhapura', 'Intercity', 1, 45, 205.00),
    (10, 'Colombo Fort - Jaffna', 'Express', 1, 49, 340.00),
    (11, 'Anuradhapura - Jaffna', 'Express', 45, 49, 135.00),

    -- Eastern Routes
    (12, 'Polonnaruwa - Batticaloa', 'Intercity', 51, 55, 90.00),
    (13, 'Colombo Fort - Trincomalee', 'Express', 1, 58, 270.00),
    (14, 'Mannar - Jaffna', 'Local', 60, 49, 80.00);

-- ============================================
-- 3. Route Stations (All stop sequences)
-- ============================================
INSERT INTO RouteStation (route_id, station_id, stop_sequence, distance_from_origin) VALUES
    -- Route 1: Colombo Fort - Kandy
    (1, 1, 1, 0.00),
    (1, 4, 2, 28.00),
    (1, 7, 3, 65.00),
    (1, 10, 4, 120.00),

    -- Route 2: Colombo Fort - Badulla (Main Line Extended)
    (2, 1, 1, 0.00),
    (2, 4, 2, 28.00),
    (2, 7, 3, 65.00),
    (2, 10, 4, 120.00),
    (2, 12, 5, 140.00),
    (2, 15, 6, 210.00),
    (2, 20, 7, 250.00),
    (2, 22, 8, 290.00),

    -- Route 5: Colombo Fort - Galle (Coastal Line)
    (5, 1, 1, 0.00),
    (5, 28, 2, 18.00),
    (5, 31, 3, 42.00),
    (5, 34, 4, 65.00),
    (5, 37, 5, 115.00),

    -- Route 6: Colombo Fort - Matara
    (6, 1, 1, 0.00),
    (6, 28, 2, 18.00),
    (6, 31, 3, 42.00),
    (6, 34, 4, 65.00),
    (6, 37, 5, 115.00),
    (6, 41, 6, 160.00),

    -- Route 9: Colombo Fort - Anuradhapura
    (9, 1, 1, 0.00),
    (9, 4, 2, 28.00),
    (9, 43, 3, 85.00),
    (9, 45, 4, 205.00),

    -- Route 10: Colombo Fort - Jaffna
    (10, 1, 1, 0.00),
    (10, 4, 2, 28.00),
    (10, 43, 3, 85.00),
    (10, 45, 4, 205.00),
    (10, 47, 5, 280.00),
    (10, 49, 6, 340.00);

-- ============================================
-- 4. Trains (15 Real Sri Lankan Trains)
-- ============================================
INSERT INTO Train (id, name, number, capacity, type, active) VALUES
    (1, 'Udarata Menike', '1015', 800, 'Intercity', TRUE),
    (2, 'Podi Menike', '1009', 800, 'Intercity', TRUE),
    (3, 'Tikiri Menike', '1023', 600, 'Intercity', TRUE),
    (4, 'Senkadagala Menike', '1030', 750, 'Intercity', TRUE),
    (5, 'Ruhunu Kumari', '8057', 600, 'Intercity', TRUE),
    (6, 'Galu Kumari', '8056', 600, 'Intercity', TRUE),
    (7, 'Sagarika', '8096', 550, 'Intercity', TRUE),
    (8, 'Yal Devi', '4077', 750, 'Intercity', TRUE),
    (9, 'Uttara Devi', '4017', 800, 'Intercity', TRUE),
    (10, 'Rajarata Rejini', '4085', 700, 'Intercity', TRUE),
    (11, 'Muthu Kumari', '4087', 650, 'Commuter', TRUE),
    (12, 'Meena Gaya', '6079', 600, 'Intercity', TRUE),
    (13, 'Badulla Night Mail', '1045', 500, 'Intercity', TRUE),
    (14, 'Batticaloa Express', '6081', 550, 'Intercity', TRUE),
    (15, 'Trincomalee Night Mail', '8081', 500, 'Intercity', TRUE);

-- ============================================
-- 5. Schedules (Daily service for each train)
-- ============================================
INSERT INTO Schedule (id, train_id, route_id, effective_start_date, effective_end_date, active) VALUES
    -- Main Line Trains
    (1, 1, 1, '2024-01-01', NULL, TRUE),   -- Udarata Menike: FOT-KAN
    (2, 2, 1, '2024-01-01', NULL, TRUE),   -- Podi Menike: FOT-KAN
    (3, 3, 2, '2024-01-01', NULL, TRUE),   -- Tikiri Menike: FOT-BAD
    (4, 4, 1, '2024-01-01', NULL, TRUE),   -- Senkadagala Menike: FOT-KAN

    -- Coast Line Trains
    (5, 5, 5, '2024-01-01', NULL, TRUE),   -- Ruhunu Kumari: FOT-GAL
    (6, 6, 5, '2024-01-01', NULL, TRUE),   -- Galu Kumari: FOT-GAL
    (7, 7, 6, '2024-01-01', NULL, TRUE),   -- Sagarika: FOT-MAT

    -- Northern Line Trains
    (8, 8, 9, '2024-01-01', NULL, TRUE),   -- Yal Devi: FOT-ANU
    (9, 9, 10, '2024-01-01', NULL, TRUE),  -- Uttara Devi: FOT-JAF
    (10, 10, 9, '2024-01-01', NULL, TRUE), -- Rajarata Rejini: FOT-ANU

    -- Additional Services
    (11, 11, 5, '2024-01-01', NULL, TRUE), -- Muthu Kumari: FOT-GAL
    (12, 12, 6, '2024-01-01', NULL, TRUE), -- Meena Gaya: FOT-MAT
    (13, 13, 2, '2024-01-01', NULL, TRUE), -- Badulla Night Mail: FOT-BAD
    (14, 14, 12, '2024-01-01', NULL, TRUE), -- Batticaloa Express: POL-BAT
    (15, 15, 13, '2024-01-01', NULL, TRUE); -- Trincomalee Night Mail: FOT-TRI

-- ============================================
-- 6. Schedule Days (All days: 0=Sunday through 6=Saturday)
-- ============================================
INSERT INTO ScheduleDays (schedule_id, day_of_week) VALUES
    -- All trains run daily (0-6 = Sun-Sat)
    (1, 0), (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
    (2, 0), (2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6),
    (3, 0), (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6),
    (4, 0), (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6),
    (5, 0), (5, 1), (5, 2), (5, 3), (5, 4), (5, 5), (5, 6),
    (6, 0), (6, 1), (6, 2), (6, 3), (6, 4), (6, 5), (6, 6),
    (7, 0), (7, 1), (7, 2), (7, 3), (7, 4), (7, 5), (7, 6),
    (8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 6),
    (9, 0), (9, 1), (9, 2), (9, 3), (9, 4), (9, 5), (9, 6),
    (10, 0), (10, 1), (10, 2), (10, 3), (10, 4), (10, 5), (10, 6),
    (11, 0), (11, 1), (11, 2), (11, 3), (11, 4), (11, 5), (11, 6),
    (12, 0), (12, 1), (12, 2), (12, 3), (12, 4), (12, 5), (12, 6),
    (13, 0), (13, 1), (13, 2), (13, 3), (13, 4), (13, 5), (13, 6),
    (14, 0), (14, 1), (14, 2), (14, 3), (14, 4), (14, 5), (14, 6),
    (15, 0), (15, 1), (15, 2), (15, 3), (15, 4), (15, 5), (15, 6);

-- ============================================
-- 7. Schedule Station Timings (ALL stations for each route)
-- ============================================

-- Schedule 1: Udarata Menike (1015) - Morning Intercity to Kandy (Route 1: FOT-KAN)
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (1, 1, NULL, '07:00:00', 0, 1, 0),
    (1, 2, '07:05:00', '07:06:00', 0, 2, 1),
    (1, 3, '07:15:00', '07:16:00', 0, 3, 1),
    (1, 4, '07:25:00', '07:27:00', 0, 4, 2),
    (1, 5, '07:35:00', '07:36:00', 0, 5, 1),
    (1, 6, '07:45:00', '07:46:00', 0, 6, 1),
    (1, 7, '07:55:00', '07:57:00', 0, 7, 2),
    (1, 8, '08:05:00', '08:06:00', 0, 8, 1),
    (1, 9, '08:15:00', '08:16:00', 0, 9, 1),
    (1, 10, '08:30:00', NULL, 0, 10, 0);

-- Schedule 2: Podi Menike (1009) - Afternoon Intercity to Kandy
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (2, 1, NULL, '14:30:00', 0, 1, 0),
    (2, 2, '14:35:00', '14:36:00', 0, 2, 1),
    (2, 3, '14:45:00', '14:46:00', 0, 3, 1),
    (2, 4, '14:55:00', '14:57:00', 0, 4, 2),
    (2, 5, '15:05:00', '15:06:00', 0, 5, 1),
    (2, 6, '15:15:00', '15:16:00', 0, 6, 1),
    (2, 7, '15:25:00', '15:27:00', 0, 7, 2),
    (2, 8, '15:35:00', '15:36:00', 0, 8, 1),
    (2, 9, '15:45:00', '15:46:00', 0, 9, 1),
    (2, 10, '16:00:00', NULL, 0, 10, 0);

-- Schedule 3: Tikiri Menike (1023) - Morning to Badulla (Route 2)
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (3, 1, NULL, '06:15:00', 0, 1, 0),
    (3, 2, '06:20:00', '06:21:00', 0, 2, 1),
    (3, 3, '06:30:00', '06:31:00', 0, 3, 1),
    (3, 4, '06:40:00', '06:42:00', 0, 4, 2),
    (3, 5, '06:50:00', '06:51:00', 0, 5, 1),
    (3, 6, '07:00:00', '07:01:00', 0, 6, 1),
    (3, 7, '07:10:00', '07:12:00', 0, 7, 2),
    (3, 8, '07:20:00', '07:21:00', 0, 8, 1),
    (3, 9, '07:30:00', '07:31:00', 0, 9, 1),
    (3, 10, '07:45:00', '07:50:00', 0, 10, 5),
    (3, 11, '08:00:00', '08:01:00', 0, 11, 1),
    (3, 12, '08:15:00', '08:17:00', 0, 12, 2),
    (3, 13, '08:45:00', '08:47:00', 0, 13, 2),
    (3, 14, '09:00:00', '09:01:00', 0, 14, 1),
    (3, 15, '09:20:00', '09:22:00', 0, 15, 2),
    (3, 16, '09:35:00', '09:36:00', 0, 16, 1),
    (3, 17, '09:55:00', '09:56:00', 0, 17, 1),
    (3, 18, '10:10:00', '10:12:00', 0, 18, 2),
    (3, 19, '10:25:00', '10:26:00', 0, 19, 1),
    (3, 20, '10:40:00', '10:42:00', 0, 20, 2),
    (3, 21, '10:55:00', '10:56:00', 0, 21, 1),
    (3, 22, '11:15:00', NULL, 0, 22, 0);

-- Schedule 5: Ruhunu Kumari (8057) - Morning to Galle (Route 5: Coast Line)
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (5, 1, NULL, '08:30:00', 0, 1, 0),
    (5, 23, '08:33:00', '08:34:00', 0, 2, 1),
    (5, 24, '08:36:00', '08:37:00', 0, 3, 1),
    (5, 25, '08:39:00', '08:40:00', 0, 4, 1),
    (5, 26, '08:42:00', '08:43:00', 0, 5, 1),
    (5, 27, '08:45:00', '08:46:00', 0, 6, 1),
    (5, 28, '08:50:00', '08:52:00', 0, 7, 2),
    (5, 29, '08:58:00', '08:59:00', 0, 8, 1),
    (5, 30, '09:05:00', '09:06:00', 0, 9, 1),
    (5, 31, '09:15:00', '09:17:00', 0, 10, 2),
    (5, 32, '09:23:00', '09:24:00', 0, 11, 1),
    (5, 33, '09:35:00', '09:36:00', 0, 12, 1),
    (5, 34, '09:45:00', '09:47:00', 0, 13, 2),
    (5, 35, '09:58:00', '09:59:00', 0, 14, 1),
    (5, 36, '10:05:00', '10:06:00', 0, 15, 1),
    (5, 37, '10:15:00', NULL, 0, 16, 0);

-- Schedule 6: Galu Kumari (8056) - Afternoon to Galle
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (6, 1, NULL, '15:45:00', 0, 1, 0),
    (6, 23, '15:48:00', '15:49:00', 0, 2, 1),
    (6, 24, '15:51:00', '15:52:00', 0, 3, 1),
    (6, 25, '15:54:00', '15:55:00', 0, 4, 1),
    (6, 26, '15:57:00', '15:58:00', 0, 5, 1),
    (6, 27, '16:00:00', '16:01:00', 0, 6, 1),
    (6, 28, '16:05:00', '16:07:00', 0, 7, 2),
    (6, 29, '16:13:00', '16:14:00', 0, 8, 1),
    (6, 30, '16:20:00', '16:21:00', 0, 9, 1),
    (6, 31, '16:30:00', '16:32:00', 0, 10, 2),
    (6, 32, '16:38:00', '16:39:00', 0, 11, 1),
    (6, 33, '16:50:00', '16:51:00', 0, 12, 1),
    (6, 34, '17:00:00', '17:02:00', 0, 13, 2),
    (6, 35, '17:13:00', '17:14:00', 0, 14, 1),
    (6, 36, '17:20:00', '17:21:00', 0, 15, 1),
    (6, 37, '17:30:00', NULL, 0, 16, 0);

-- Schedule 7: Sagarika (8096) - Morning to Matara (Route 6)
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (7, 1, NULL, '07:30:00', 0, 1, 0),
    (7, 23, '07:33:00', '07:34:00', 0, 2, 1),
    (7, 24, '07:36:00', '07:37:00', 0, 3, 1),
    (7, 25, '07:39:00', '07:40:00', 0, 4, 1),
    (7, 26, '07:42:00', '07:43:00', 0, 5, 1),
    (7, 27, '07:45:00', '07:46:00', 0, 6, 1),
    (7, 28, '07:50:00', '07:52:00', 0, 7, 2),
    (7, 29, '07:58:00', '07:59:00', 0, 8, 1),
    (7, 30, '08:05:00', '08:06:00', 0, 9, 1),
    (7, 31, '08:15:00', '08:17:00', 0, 10, 2),
    (7, 32, '08:23:00', '08:24:00', 0, 11, 1),
    (7, 33, '08:35:00', '08:36:00', 0, 12, 1),
    (7, 34, '08:45:00', '08:47:00', 0, 13, 2),
    (7, 35, '08:58:00', '08:59:00', 0, 14, 1),
    (7, 36, '09:05:00', '09:06:00', 0, 15, 1),
    (7, 37, '09:15:00', '09:20:00', 0, 16, 5),
    (7, 38, '09:28:00', '09:29:00', 0, 17, 1),
    (7, 39, '09:35:00', '09:36:00', 0, 18, 1),
    (7, 40, '09:45:00', '09:47:00', 0, 19, 2),
    (7, 41, '10:00:00', NULL, 0, 20, 0);

-- Schedule 8: Yal Devi (4077) - Morning to Anuradhapura (Route 9)
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (8, 1, NULL, '06:00:00', 0, 1, 0),
    (8, 2, '06:05:00', '06:06:00', 0, 2, 1),
    (8, 3, '06:15:00', '06:16:00', 0, 3, 1),
    (8, 4, '06:25:00', '06:27:00', 0, 4, 2),
    (8, 5, '06:35:00', '06:36:00', 0, 5, 1),
    (8, 6, '06:45:00', '06:46:00', 0, 6, 1),
    (8, 7, '06:55:00', '06:57:00', 0, 7, 2),
    (8, 43, '07:30:00', '07:32:00', 0, 8, 2),
    (8, 44, '08:00:00', '08:02:00', 0, 9, 2),
    (8, 45, '09:00:00', NULL, 0, 10, 0);

-- Schedule 9: Uttara Devi (4017) - Night Mail to Jaffna (Route 10)
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (9, 1, NULL, '20:00:00', 0, 1, 0),
    (9, 2, '20:05:00', '20:06:00', 0, 2, 1),
    (9, 3, '20:15:00', '20:16:00', 0, 3, 1),
    (9, 4, '20:25:00', '20:27:00', 0, 4, 2),
    (9, 5, '20:35:00', '20:36:00', 0, 5, 1),
    (9, 6, '20:45:00', '20:46:00', 0, 6, 1),
    (9, 7, '20:55:00', '20:57:00', 0, 7, 2),
    (9, 43, '21:30:00', '21:32:00', 0, 8, 2),
    (9, 44, '22:00:00', '22:02:00', 0, 9, 2),
    (9, 45, '23:00:00', '23:05:00', 0, 10, 5),
    (9, 46, '23:30:00', '23:32:00', 0, 11, 2),
    (9, 47, '00:30:00', '00:35:00', 1, 12, 5),
    (9, 48, '01:30:00', '01:32:00', 1, 13, 2),
    (9, 49, '03:00:00', NULL, 1, 14, 0);

-- Schedule 10: Rajarata Rejini (4085) - Afternoon to Anuradhapura
INSERT INTO ScheduleStationTiming (schedule_id, station_id, arrival_time, departure_time, day_offset, stop_sequence, stop_duration_minutes) VALUES
    (10, 1, NULL, '13:30:00', 0, 1, 0),
    (10, 2, '13:35:00', '13:36:00', 0, 2, 1),
    (10, 3, '13:45:00', '13:46:00', 0, 3, 1),
    (10, 4, '13:55:00', '13:57:00', 0, 4, 2),
    (10, 5, '14:05:00', '14:06:00', 0, 5, 1),
    (10, 6, '14:15:00', '14:16:00', 0, 6, 1),
    (10, 7, '14:25:00', '14:27:00', 0, 7, 2),
    (10, 43, '15:00:00', '15:02:00', 0, 8, 2),
    (10, 44, '15:30:00', '15:32:00', 0, 9, 2),
    (10, 45, '16:30:00', NULL, 0, 10, 0);

-- ============================================
-- 8. Route Fares
-- ============================================
INSERT INTO RouteFare (route_id, class_type, price, effective_date) VALUES
    (1, 1, 580.00, '2024-01-01'), (1, 2, 320.00, '2024-01-01'), (1, 3, 180.00, '2024-01-01'),
    (2, 1, 850.00, '2024-01-01'), (2, 2, 480.00, '2024-01-01'), (2, 3, 260.00, '2024-01-01'),
    (5, 1, 550.00, '2024-01-01'), (5, 2, 300.00, '2024-01-01'), (5, 3, 165.00, '2024-01-01'),
    (6, 1, 750.00, '2024-01-01'), (6, 2, 420.00, '2024-01-01'), (6, 3, 230.00, '2024-01-01'),
    (9, 1, 980.00, '2024-01-01'), (9, 2, 540.00, '2024-01-01'), (9, 3, 300.00, '2024-01-01'),
    (10, 1, 1580.00, '2024-01-01'), (10, 2, 880.00, '2024-01-01'), (10, 3, 480.00, '2024-01-01');

-- ============================================
-- 9. Trip Status Updates (Sample real-time data)
-- ============================================
INSERT INTO TripStatusUpdate (schedule_id, trip_date, current_station_id, status, delay_minutes, last_updated, notes) VALUES
    -- Current day updates
    (1, CURRENT_DATE, 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Arrived on time at Kandy'),
    (2, CURRENT_DATE, 10, 'On Time', 0, CURRENT_TIMESTAMP - INTERVAL '1 hour', 'Running on schedule'),
    (5, CURRENT_DATE, 37, 'On Time', 0, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'Arrived Galle on time'),
    (6, CURRENT_DATE, 31, 'Delayed', 15, CURRENT_TIMESTAMP - INTERVAL '10 minutes', 'Signal issue at Panadura'),
    (7, CURRENT_DATE, 41, 'On Time', 0, CURRENT_TIMESTAMP - INTERVAL '45 minutes', 'Running smoothly'),
    (8, CURRENT_DATE, 45, 'Delayed', 10, CURRENT_TIMESTAMP - INTERVAL '5 minutes', 'Minor delay at Anuradhapura'),

    -- Historical data for Schedule 1 (Udarata Menike) - HIGH RELIABILITY (mostly on time)
    (1, CURRENT_DATE - INTERVAL '1 day', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Arrived on time'),
    (1, CURRENT_DATE - INTERVAL '2 days', 10, 'Completed', 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'Minor delay'),
    (1, CURRENT_DATE - INTERVAL '3 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '3 days', 'On time'),
    (1, CURRENT_DATE - INTERVAL '4 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '4 days', 'On time'),
    (1, CURRENT_DATE - INTERVAL '5 days', 10, 'Completed', 3, CURRENT_TIMESTAMP - INTERVAL '5 days', 'Slight delay'),
    (1, CURRENT_DATE - INTERVAL '6 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '6 days', 'On time'),
    (1, CURRENT_DATE - INTERVAL '7 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '7 days', 'On time'),
    (1, CURRENT_DATE - INTERVAL '8 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '8 days', 'On time'),

    -- Historical data for Schedule 2 (Podi Menike) - MEDIUM RELIABILITY (mix of on time and delayed)
    (2, CURRENT_DATE - INTERVAL '1 day', 10, 'Completed', 8, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Moderate delay'),
    (2, CURRENT_DATE - INTERVAL '2 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '2 days', 'On time'),
    (2, CURRENT_DATE - INTERVAL '3 days', 10, 'Completed', 12, CURRENT_TIMESTAMP - INTERVAL '3 days', 'Delayed'),
    (2, CURRENT_DATE - INTERVAL '4 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '4 days', 'On time'),
    (2, CURRENT_DATE - INTERVAL '5 days', 10, 'Completed', 15, CURRENT_TIMESTAMP - INTERVAL '5 days', 'Significant delay'),
    (2, CURRENT_DATE - INTERVAL '6 days', 10, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '6 days', 'On time'),
    (2, CURRENT_DATE - INTERVAL '7 days', 10, 'Completed', 5, CURRENT_TIMESTAMP - INTERVAL '7 days', 'Minor delay'),

    -- Historical data for Schedule 5 (Ruhunu Kumari) - LOW RELIABILITY (often delayed)
    (5, CURRENT_DATE - INTERVAL '1 day', 37, 'Completed', 20, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Major delay'),
    (5, CURRENT_DATE - INTERVAL '2 days', 37, 'Completed', 25, CURRENT_TIMESTAMP - INTERVAL '2 days', 'Severe delay'),
    (5, CURRENT_DATE - INTERVAL '3 days', 37, 'Completed', 15, CURRENT_TIMESTAMP - INTERVAL '3 days', 'Delayed'),
    (5, CURRENT_DATE - INTERVAL '4 days', 37, 'Completed', 30, CURRENT_TIMESTAMP - INTERVAL '4 days', 'Very late'),
    (5, CURRENT_DATE - INTERVAL '5 days', 37, 'Completed', 0, CURRENT_TIMESTAMP - INTERVAL '5 days', 'Rare on-time arrival');

-- ============================================
-- 7. Sample Users (with bcrypt hashed passwords: 'password123')
-- Hash generated with bcrypt, 10 rounds
-- ============================================
-- Password for all sample users: 'password123'
-- Hashed with bcrypt: $2b$10$Y8k/wbXoW3iHLFNiiKudwuegDAlViFIkHKu0ZCWAozzAwGixnXgZC

INSERT INTO "User" (id, email, password_hash, first_name, last_name, phone, role, active, email_verified) VALUES
    (1, 'admin@ceylontrack.lk', '$2b$10$Y8k/wbXoW3iHLFNiiKudwuegDAlViFIkHKu0ZCWAozzAwGixnXgZC', 'System', 'Administrator', '+94761234567', 'Admin', TRUE, TRUE),
    (2, 'staff@ceylontrack.lk', '$2b$10$Y8k/wbXoW3iHLFNiiKudwuegDAlViFIkHKu0ZCWAozzAwGixnXgZC', 'Station', 'Master', '+94769876543', 'Staff', TRUE, TRUE),
    (3, 'passenger@example.com', '$2b$10$Y8k/wbXoW3iHLFNiiKudwuegDAlViFIkHKu0ZCWAozzAwGixnXgZC', 'Test', 'Passenger', '+94771234567', 'Passenger', TRUE, TRUE);

-- ============================================
-- 8. Sample Journey Watches
-- ============================================
INSERT INTO JourneyWatch (user_id, schedule_id, from_station_id, to_station_id, watch_date, notify_before_minutes, active) VALUES
    (3, 1, 1, 2, CURRENT_DATE + INTERVAL '1 day', 30, TRUE),
    (3, 2, 1, 3, NULL, 45, TRUE);
