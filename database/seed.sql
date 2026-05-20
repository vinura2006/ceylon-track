-- ============================================
-- Ceylon Track - Seed Data
-- ============================================
/*
  To regenerate bcrypt hashes, run in Node.js:
  const bcrypt = require('bcryptjs');
  console.log(await bcrypt.hash('Pass123!', 10));   // passenger
  console.log(await bcrypt.hash('Staff123!', 10));  // staff
  console.log(await bcrypt.hash('Admin123!', 10));  // admin
  Then replace the hashes below with the output.
*/

-- Truncate all tables to allow re-seeding safely
TRUNCATE users, journey_watches, trip_status_updates, stop_times, schedules, stations RESTART IDENTITY CASCADE;

-- SECTION 1 — Insert 10 core real Sri Lankan stations + intermediate stops
INSERT INTO stations (id, name, code, location) VALUES
  (1, 'Colombo Fort', 'FOT', ST_SetSRID(ST_MakePoint(79.8477, 6.9344), 4326)::geography),
  (2, 'Kandy', 'KAN', ST_SetSRID(ST_MakePoint(80.6337, 7.2906), 4326)::geography),
  (3, 'Galle', 'GAL', ST_SetSRID(ST_MakePoint(80.2170, 6.0535), 4326)::geography),
  (4, 'Matara', 'MAT', ST_SetSRID(ST_MakePoint(80.5353, 5.9549), 4326)::geography),
  (5, 'Negombo', 'NEG', ST_SetSRID(ST_MakePoint(79.8477, 7.2096), 4326)::geography),
  (6, 'Badulla', 'BAD', ST_SetSRID(ST_MakePoint(81.0560, 6.9934), 4326)::geography),
  (7, 'Anuradhapura', 'ANP', ST_SetSRID(ST_MakePoint(80.3864, 8.3114), 4326)::geography),
  (8, 'Jaffna', 'JAF', ST_SetSRID(ST_MakePoint(80.0137, 9.6615), 4326)::geography),
  (9, 'Kurunegala', 'KUR', ST_SetSRID(ST_MakePoint(80.3647, 7.4868), 4326)::geography),
  (10, 'Ratnapura', 'RAT', ST_SetSRID(ST_MakePoint(80.4022, 6.6828), 4326)::geography),
  -- Intermediate stops
  (11, 'Ragama', 'RAG', ST_SetSRID(ST_MakePoint(79.8925, 7.0311), 4326)::geography),
  (12, 'Veyangoda', 'VEY', ST_SetSRID(ST_MakePoint(80.0586, 7.1550), 4326)::geography),
  (13, 'Polgahawela', 'PLG', ST_SetSRID(ST_MakePoint(80.2653, 7.3350), 4326)::geography),
  (14, 'Peradeniya Junction', 'PDN', ST_SetSRID(ST_MakePoint(80.5950, 7.2650), 4326)::geography),
  (15, 'Kalutara North', 'KTN', ST_SetSRID(ST_MakePoint(79.9653, 6.5853), 4326)::geography),
  (16, 'Beruwala', 'BER', ST_SetSRID(ST_MakePoint(79.9800, 6.4800), 4326)::geography),
  (17, 'Aluthgama', 'ALG', ST_SetSRID(ST_MakePoint(80.0931, 6.4336), 4326)::geography),
  (18, 'Hikkaduwa', 'HIK', ST_SetSRID(ST_MakePoint(80.1022, 6.1406), 4326)::geography),
  (19, 'Rambukkana', 'RBK', ST_SetSRID(ST_MakePoint(80.3831, 7.3258), 4326)::geography),
  (20, 'Gampola', 'GPL', ST_SetSRID(ST_MakePoint(80.5764, 7.1644), 4326)::geography),
  (21, 'Nawalapitiya', 'NWP', ST_SetSRID(ST_MakePoint(80.3914, 7.0431), 4326)::geography),
  (22, 'Hatton', 'HAT', ST_SetSRID(ST_MakePoint(80.6000, 6.8936), 4326)::geography),
  (23, 'Ella', 'ELL', ST_SetSRID(ST_MakePoint(81.0406, 6.8758), 4326)::geography);

SELECT setval('stations_id_seq', 23);

-- SECTION 2 — Insert 8 realistic train schedules
INSERT INTO schedules (id, train_number, train_name, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week) VALUES
  (1, '1014', 'Intercity Express', (SELECT id FROM stations WHERE code = 'FOT'), (SELECT id FROM stations WHERE code = 'KAN'), '06:00:00', '08:30:00', '1st', '{1,2,3,4,5,6,7}'),
  (2, '1084', 'Coastal Line', (SELECT id FROM stations WHERE code = 'FOT'), (SELECT id FROM stations WHERE code = 'GAL'), '07:15:00', '09:45:00', 'mixed', '{1,2,3,4,5,6,7}'),
  (3, '1086', 'Ruhunu Kumari', (SELECT id FROM stations WHERE code = 'FOT'), (SELECT id FROM stations WHERE code = 'MAT'), '08:00:00', '11:00:00', 'mixed', '{1,2,3,4,5,6,7}'),
  (4, '1005', 'Udarata Menike', (SELECT id FROM stations WHERE code = 'FOT'), (SELECT id FROM stations WHERE code = 'BAD'), '05:45:00', '11:30:00', 'mixed', '{1,2,3,4,5,6,7}'),
  (5, '1068', 'Yal Devi', (SELECT id FROM stations WHERE code = 'FOT'), (SELECT id FROM stations WHERE code = 'ANP'), '06:30:00', '10:00:00', '2nd', '{1,2,3,4,5,6,7}'),
  (6, '1015', 'Intercity Return', (SELECT id FROM stations WHERE code = 'KAN'), (SELECT id FROM stations WHERE code = 'FOT'), '14:00:00', '16:30:00', '1st', '{1,2,3,4,5,6,7}'),
  (7, '1083', 'Coastal Return', (SELECT id FROM stations WHERE code = 'GAL'), (SELECT id FROM stations WHERE code = 'FOT'), '15:30:00', '18:00:00', 'mixed', '{1,2,3,4,5,6,7}'),
  (8, '1022', 'Kurunegala Express', (SELECT id FROM stations WHERE code = 'FOT'), (SELECT id FROM stations WHERE code = 'KUR'), '07:00:00', '09:00:00', '2nd', '{1,2,3,4,5,6,7}');

SELECT setval('schedules_id_seq', 8);

-- SECTION 3 — Insert stop_times for 3 schedules
-- For Train 1014 (FOT→KAN)
INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform) VALUES
  (1, (SELECT id FROM stations WHERE code = 'FOT'), 'Colombo Fort', '06:00:00', 1, '3'),
  (1, (SELECT id FROM stations WHERE code = 'RAG'), 'Ragama', '06:25:00', 2, '1'),
  (1, (SELECT id FROM stations WHERE code = 'VEY'), 'Veyangoda', '06:55:00', 3, '2'),
  (1, (SELECT id FROM stations WHERE code = 'PLG'), 'Polgahawela', '07:30:00', 4, '1'),
  (1, (SELECT id FROM stations WHERE code = 'PDN'), 'Peradeniya Junction', '08:15:00', 5, '2'),
  (1, (SELECT id FROM stations WHERE code = 'KAN'), 'Kandy', '08:30:00', 6, '1');

-- For Train 1084 (FOT→GAL)
INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform) VALUES
  (2, (SELECT id FROM stations WHERE code = 'FOT'), 'Colombo Fort', '07:15:00', 1, '8'),
  (2, (SELECT id FROM stations WHERE code = 'KTN'), 'Kalutara North', '08:05:00', 2, '2'),
  (2, (SELECT id FROM stations WHERE code = 'BER'), 'Beruwala', '08:30:00', 3, '1'),
  (2, (SELECT id FROM stations WHERE code = 'ALG'), 'Aluthgama', '08:45:00', 4, '1'),
  (2, (SELECT id FROM stations WHERE code = 'HIK'), 'Hikkaduwa', '09:20:00', 5, '2'),
  (2, (SELECT id FROM stations WHERE code = 'GAL'), 'Galle', '09:45:00', 6, '1');

-- For Train 1005 (FOT→BAD)
INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform) VALUES
  (4, (SELECT id FROM stations WHERE code = 'FOT'), 'Colombo Fort', '05:45:00', 1, '4'),
  (4, (SELECT id FROM stations WHERE code = 'RBK'), 'Rambukkana', '07:15:00', 2, '2'),
  (4, (SELECT id FROM stations WHERE code = 'GPL'), 'Gampola', '08:00:00', 3, '1'),
  (4, (SELECT id FROM stations WHERE code = 'NWP'), 'Nawalapitiya', '08:30:00', 4, '2'),
  (4, (SELECT id FROM stations WHERE code = 'HAT'), 'Hatton', '09:15:00', 5, '1'),
  (4, (SELECT id FROM stations WHERE code = 'ELL'), 'Ella', '10:45:00', 6, '1'),
  (4, (SELECT id FROM stations WHERE code = 'BAD'), 'Badulla', '11:30:00', 7, '1');

-- SECTION 4 — Insert 3 users with verified bcrypt hashed passwords
INSERT INTO users (id, email, password_hash, first_name, last_name, role, sub_role) VALUES
  (1, 'passenger@ceylon.lk', '$2a$10$k7kpxcUcOPx6dG4Kpnryz.ZBgJIl25dZBdUBeJz6T8zA.ubEiRAJa', 'Test', 'Passenger', 'passenger', NULL),
  (2, 'staff@ceylon.lk', '$2a$10$qxCL1TIQWP.jjDg4ocHro.l6x.56WMoZlC00lAeucQsc.2vRRaCoy', 'Station', 'Master', 'staff', 'station_master'),
  (3, 'admin@ceylon.lk', '$2a$10$f2eAt1UuqwYXBlTutavpye3A3En490Zef8g1Tdrz4UKPU93gyR.s6', 'System', 'Admin', 'admin', NULL);

SELECT setval('users_id_seq', 3);

-- SECTION 5 — Insert 25 trip_status_updates across the last 30 days
-- Spread across 8 schedules. Mix of ON_TIME (60%), DELAYED (30%), CANCELLED (10%)
-- Realistic GPS tracks from Colombo Fort (79.8477, 6.9344) to Kandy (80.6337, 7.2906)
INSERT INTO trip_status_updates (schedule_id, trip_date, status, delay_minutes, current_lat, current_lng, notes) VALUES
  -- Today live status updates
  (1, CURRENT_DATE, 'ON_TIME', 0, 8.0125, 80.4500, 'Running perfectly'),
  (2, CURRENT_DATE, 'DELAYED', 15, 6.4520, 80.0050, 'Signal delay at Aluthgama'),
  (3, CURRENT_DATE, 'ON_TIME', 0, 6.0425, 80.2500, 'Arriving Galle shortly'),
  (4, CURRENT_DATE, 'DELAYED', 35, 7.0250, 80.4560, 'Engine overheating resolved'),
  (5, CURRENT_DATE, 'ON_TIME', 0, 7.8250, 80.3120, 'On schedule'),
  (6, CURRENT_DATE, 'ON_TIME', 0, 7.1520, 80.2050, 'Return Intercity operating normal'),
  (7, CURRENT_DATE, 'ON_TIME', 0, 6.2500, 80.1200, 'Coastal Return on track'),
  (8, CURRENT_DATE, 'CANCELLED', 0, NULL, NULL, 'Maintenance cancellation'),

  -- Yesterday status updates
  (1, CURRENT_DATE - 1, 'ON_TIME', 0, 7.2906, 80.6337, 'Arrived on time yesterday'),
  (2, CURRENT_DATE - 1, 'ON_TIME', 0, 6.0535, 80.2170, 'Galle intercity completed'),
  (3, CURRENT_DATE - 1, 'DELAYED', 25, 5.9549, 80.5353, 'Rain delays'),
  (4, CURRENT_DATE - 1, 'ON_TIME', 0, 6.9934, 81.0560, 'Badulla express on time'),
  (5, CURRENT_DATE - 1, 'ON_TIME', 0, 8.3114, 80.3864, 'Anuradhapura run complete'),

  -- Historical status updates (last 3-10 days)
  (1, CURRENT_DATE - 2, 'ON_TIME', 0, 7.2906, 80.6337, 'On time'),
  (1, CURRENT_DATE - 3, 'DELAYED', 10, 7.1250, 80.5050, 'Minor delay'),
  (1, CURRENT_DATE - 4, 'ON_TIME', 0, 7.2906, 80.6337, 'On time'),
  (1, CURRENT_DATE - 5, 'ON_TIME', 0, 7.2906, 80.6337, 'On time'),
  (1, CURRENT_DATE - 6, 'ON_TIME', 0, 7.2906, 80.6337, 'On time'),
  (1, CURRENT_DATE - 7, 'ON_TIME', 0, 7.2906, 80.6337, 'On time'),

  (2, CURRENT_DATE - 2, 'DELAYED', 45, 6.0535, 80.2170, 'Engine failure'),
  (2, CURRENT_DATE - 3, 'ON_TIME', 0, 6.0535, 80.2170, 'On time'),
  (2, CURRENT_DATE - 4, 'DELAYED', 20, 6.0535, 80.2170, 'Signal issues'),

  (3, CURRENT_DATE - 2, 'ON_TIME', 0, 5.9549, 80.5353, 'On time'),
  (3, CURRENT_DATE - 3, 'CANCELLED', 0, NULL, NULL, 'Strike disruption'),
  (3, CURRENT_DATE - 4, 'ON_TIME', 0, 5.9549, 80.5353, 'On time');

-- SECTION 6 — Seed sri_lanka_timetable
INSERT INTO sri_lanka_timetable (id, train_no, train_name, route_name, start_station_id, end_station_id, departure_time, arrival_time, train_class, frequency) VALUES
  (1, '1001', 'Udarata Menike', 'Main Line', 1, 6, '05:55:00', '16:07:00', '1st, 2nd, 3rd Class', 'Daily'),
  (2, '1005', 'Podi Menike', 'Main Line', 1, 6, '08:30:00', '19:02:00', '1st, 2nd, 3rd Class', 'Daily'),
  (3, '4077', 'Yal Devi', 'Northern Line', 1, 8, '06:35:00', '13:58:00', '1st, 2nd, 3rd Class', 'Daily'),
  (4, '8039', 'Ruhunu Kumari', 'Coastal Line', 3, 1, '06:05:00', '09:00:00', '2nd, 3rd Class', 'Daily'),
  (5, '8056', 'Galu Kumari', 'Coastal Line', 1, 4, '14:05:00', '17:25:00', '1st, 2nd, 3rd Class', 'Daily'),
  (6, '1015', 'Tikiri Menike', 'Main Line', 6, 1, '06:10:00', '16:00:00', '2nd, 3rd Class', 'Daily'),
  (7, '4003', 'Uttara Devi', 'Northern Line', 1, 8, '11:50:00', '18:30:00', '1st, 2nd Class', 'Daily'),
  (8, '8050', 'Sagarika', 'Coastal Line', 4, 1, '04:55:00', '08:15:00', '2nd, 3rd Class', 'Daily'),
  (9, '1030', 'Kandy Express', 'Main Line', 1, 2, '17:30:00', '20:00:00', '1st, 2nd Class', 'Daily'),
  (10, '1045', 'Night Mail', 'Main Line', 1, 6, '20:00:00', '06:15:00', '2nd, 3rd Class', 'Daily');

SELECT setval('sri_lanka_timetable_id_seq', 10);

-- SECTION 7 — Seed timetable_stops
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  -- Stops for Udarata Menike (id 1)
  (1, 1, '05:55:00', '05:55:00', 1),
  (1, 11, '06:20:00', '06:22:00', 2),
  (1, 12, '06:50:00', '06:51:00', 3),
  (1, 13, '07:25:00', '07:30:00', 4),
  (1, 14, '08:10:00', '08:12:00', 5),
  (1, 2, '08:25:00', '08:35:00', 6),
  (1, 6, '16:07:00', '16:07:00', 7);
