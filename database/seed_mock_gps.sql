-- ============================================================
-- Ceylon Track — Hyper-Precise Mock Live GPS Seed Data
-- Inserts realistic train positions perfectly aligned to tracks.
-- Run with:
--   psql -U postgres -d ceylontrack -f database/seed_mock_gps.sql
-- ============================================================

INSERT INTO TripStatusUpdate (train_id, current_lat, current_lng, speed_kmh, delay_minutes, last_gps_update) VALUES 
(1, 7.25624, 80.51433, 45.5, 10, CURRENT_TIMESTAMP),  -- Udarata Menike strictly on Kadugannawa track
(9, 8.33380, 80.39850, 65.0, 0, CURRENT_TIMESTAMP),   -- Yal Devi strictly on Anuradhapura track
(6, 6.13965, 80.10145, 55.2, 5, CURRENT_TIMESTAMP)    -- Ruhunu Kumari strictly on Hikkaduwa track
ON CONFLICT (train_id) DO UPDATE SET 
current_lat = EXCLUDED.current_lat, 
current_lng = EXCLUDED.current_lng, 
speed_kmh = EXCLUDED.speed_kmh, 
last_gps_update = CURRENT_TIMESTAMP;
