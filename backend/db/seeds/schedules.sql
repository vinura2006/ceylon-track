-- Seed: Realistic Sri Lanka Railways 2026 schedule data
-- Uses station IDs via subqueries for compatibility

-- Helper: resolve station ID by code
-- ROUTE 1: Main Line — Colombo to Kandy
INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Intercity Express', '1001', f.id, t.id, '07:00', '09:45', '1st', ARRAY[1,2,3,4,5]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'KDY'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Udarata Menike', '1003', f.id, t.id, '09:45', '13:30', '2nd', ARRAY[0,1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'KDY'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Podi Menike', '1005', f.id, t.id, '05:55', '14:20', '2nd', ARRAY[1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'BDL'
ON CONFLICT DO NOTHING;

-- ROUTE 2: Coastal Line — Colombo to Matara
INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Ruhunu Kumari', '8701', f.id, t.id, '06:35', '10:35', '1st', ARRAY[1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'MTR'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Galu Kumari', '8705', f.id, t.id, '07:10', '10:00', '2nd', ARRAY[0,1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'GLE'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Samudra Devi', '8711', f.id, t.id, '15:30', '19:25', '2nd', ARRAY[0,1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'MTR'
ON CONFLICT DO NOTHING;

-- ROUTE 3: Upcountry Line — Colombo to Badulla
INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Expo Rail Upcountry', '4001', f.id, t.id, '08:30', '17:55', '1st', ARRAY[1,2,3,4,5]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'BDL'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Night Mail', '4051', f.id, t.id, '20:00', '05:30', '2nd', ARRAY[0,1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'BDL'
ON CONFLICT DO NOTHING;

-- ROUTE 4: Northern Line — Colombo to Anuradhapura
INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Yal Devi', '4101', f.id, t.id, '06:00', '10:30', '1st', ARRAY[1,2,3,4,5]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'APR'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Uttara Devi', '4107', f.id, t.id, '12:30', '17:15', '2nd', ARRAY[0,1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'APR'
ON CONFLICT DO NOTHING;

-- ROUTE 5: Puttalam Line — Colombo to Negombo
INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Puttalam Express', '2001', f.id, t.id, '06:40', '08:00', '2nd', ARRAY[1,2,3,4,5]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'NGO'
ON CONFLICT DO NOTHING;

INSERT INTO schedules (train_name, train_number, from_station_id, to_station_id, departure_time, arrival_time, class, days_of_week)
SELECT 'Sea Coast Flyer', '2005', f.id, t.id, '17:00', '18:25', '2nd', ARRAY[0,1,2,3,4,5,6]
FROM stations f, stations t WHERE f.code = 'FOT' AND t.code = 'NGO'
ON CONFLICT DO NOTHING;
