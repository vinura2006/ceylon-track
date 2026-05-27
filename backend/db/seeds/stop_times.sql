-- Seed: Stop times for Udarata Menike (train #1003) — Main Line Colombo to Kandy

INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform)
SELECT s.id, st.id, st.name, '09:47', 1, '1'
FROM schedules s, stations st WHERE s.train_number = '1003' AND st.code = 'MRD'
ON CONFLICT DO NOTHING;

INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform)
SELECT s.id, st.id, st.name, '10:15', 2, '2'
FROM schedules s, stations st WHERE s.train_number = '1003' AND st.code = 'RGM'
ON CONFLICT DO NOTHING;

INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform)
SELECT s.id, st.id, st.name, '11:05', 3, '1'
FROM schedules s, stations st WHERE s.train_number = '1003' AND st.code = 'PLG'
ON CONFLICT DO NOTHING;

INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform)
SELECT s.id, st.id, st.name, '11:32', 4, '1'
FROM schedules s, stations st WHERE s.train_number = '1003' AND st.code = 'RBK'
ON CONFLICT DO NOTHING;

INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform)
SELECT s.id, st.id, st.name, '13:10', 5, '2'
FROM schedules s, stations st WHERE s.train_number = '1003' AND st.code = 'PDN'
ON CONFLICT DO NOTHING;

INSERT INTO stop_times (schedule_id, station_id, station_name, scheduled_time, stop_sequence, platform)
SELECT s.id, st.id, st.name, '13:30', 6, '1'
FROM schedules s, stations st WHERE s.train_number = '1003' AND st.code = 'KDY'
ON CONFLICT DO NOTHING;
