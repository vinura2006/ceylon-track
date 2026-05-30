-- Ceylon Track - Timetable Enhancement Migration
-- Create Change Requests Table and Seed Complete Timetable Stops

-- 1. Create Change Requests Table
CREATE TABLE IF NOT EXISTS timetable_change_requests (
    id SERIAL PRIMARY KEY,
    timetable_id INTEGER REFERENCES sri_lanka_timetable(id) ON DELETE CASCADE,
    requested_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('edit', 'add', 'delete')),
    
    -- Proposed values
    proposed_train_no VARCHAR(20),
    proposed_train_name VARCHAR(100),
    proposed_route_name VARCHAR(100),
    proposed_start_station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    proposed_end_station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    proposed_departure_time TIME,
    proposed_arrival_time TIME,
    proposed_train_class VARCHAR(50),
    proposed_frequency VARCHAR(50),
    
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

-- 2. Clear old stops to re-seed comprehensively
TRUNCATE timetable_stops RESTART IDENTITY;

-- 3. Seed Complete stops for all 10 sri_lanka_timetable entries

-- Train 1: Udarata Menike (FOT -> BAD, id 1)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (1, 1, '05:55:00', '05:55:00', 1),
  (1, 11, '06:20:00', '06:22:00', 2),
  (1, 12, '06:50:00', '06:51:00', 3),
  (1, 13, '07:25:00', '07:30:00', 4),
  (1, 14, '08:10:00', '08:12:00', 5),
  (1, 2, '08:25:00', '08:35:00', 6),
  (1, 6, '16:07:00', '16:07:00', 7);

-- Train 2: Podi Menike (FOT -> BAD, id 2)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (2, 1, '08:30:00', '08:30:00', 1),
  (2, 11, '08:55:00', '08:57:00', 2),
  (2, 12, '09:25:00', '09:27:00', 3),
  (2, 13, '10:05:00', '10:10:00', 4),
  (2, 14, '11:15:00', '11:17:00', 5),
  (2, 2, '11:35:00', '11:45:00', 6),
  (2, 6, '19:02:00', '19:02:00', 7);

-- Train 3: Yal Devi (FOT -> JAF, id 3)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (3, 1, '06:35:00', '06:35:00', 1),
  (3, 11, '07:00:00', '07:02:00', 2),
  (3, 12, '07:30:00', '07:31:00', 3),
  (3, 13, '08:10:00', '08:15:00', 4),
  (3, 9, '08:45:00', '08:50:00', 5),
  (3, 7, '10:30:00', '10:35:00', 6),
  (3, 8, '13:58:00', '13:58:00', 7);

-- Train 4: Ruhunu Kumari (GAL -> FOT, id 4)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (4, 3, '06:05:00', '06:05:00', 1),
  (4, 18, '06:25:00', '06:27:00', 2),
  (4, 17, '07:00:00', '07:02:00', 3),
  (4, 16, '07:15:00', '07:16:00', 4),
  (4, 15, '07:40:00', '07:42:00', 5),
  (4, 1, '09:00:00', '09:00:00', 6);

-- Train 5: Galu Kumari (FOT -> MAT, id 5)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (5, 1, '14:05:00', '14:05:00', 1),
  (5, 15, '15:10:00', '15:12:00', 2),
  (5, 16, '15:35:00', '15:36:00', 3),
  (5, 17, '15:50:00', '15:52:00', 4),
  (5, 18, '16:25:00', '16:27:00', 5),
  (5, 3, '16:50:00', '17:00:00', 6),
  (5, 4, '17:25:00', '17:25:00', 7);

-- Train 6: Tikiri Menike (BAD -> FOT, id 6)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (6, 6, '06:10:00', '06:10:00', 1),
  (6, 2, '13:00:00', '13:10:00', 2),
  (6, 14, '13:25:00', '13:27:00', 3),
  (6, 13, '14:20:00', '14:25:00', 4),
  (6, 12, '15:05:00', '15:07:00', 5),
  (6, 11, '15:35:00', '15:37:00', 6),
  (6, 1, '16:00:00', '16:00:00', 7);

-- Train 7: Uttara Devi (FOT -> JAF, id 7)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (7, 1, '11:50:00', '11:50:00', 1),
  (7, 11, '12:15:00', '12:17:00', 2),
  (7, 12, '12:45:00', '12:46:00', 3),
  (7, 13, '13:20:00', '13:25:00', 4),
  (7, 9, '13:55:00', '14:00:00', 5),
  (7, 7, '15:30:00', '15:35:00', 6),
  (7, 8, '18:30:00', '18:30:00', 7);

-- Train 8: Sagarika (MAT -> FOT, id 8)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (8, 4, '04:55:00', '04:55:00', 1),
  (8, 3, '05:25:00', '05:30:00', 2),
  (8, 18, '05:55:00', '05:57:00', 3),
  (8, 17, '06:30:00', '06:32:00', 4),
  (8, 16, '06:45:00', '06:46:00', 5),
  (8, 15, '07:10:00', '07:12:00', 6),
  (8, 1, '08:15:00', '08:15:00', 7);

-- Train 9: Kandy Express (FOT -> KAN, id 9)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (9, 1, '17:30:00', '17:30:00', 1),
  (9, 11, '17:55:00', '17:57:00', 2),
  (9, 12, '18:25:00', '18:27:00', 3),
  (9, 13, '19:05:00', '19:10:00', 4),
  (9, 14, '19:45:00', '19:47:00', 5),
  (9, 2, '20:00:00', '20:00:00', 6);

-- Train 10: Night Mail (FOT -> BAD, id 10)
INSERT INTO timetable_stops (timetable_id, station_id, arrival_time, departure_time, stop_sequence) VALUES
  (10, 1, '20:00:00', '20:00:00', 1),
  (10, 11, '20:30:00', '20:32:00', 2),
  (10, 12, '21:05:00', '21:07:00', 3),
  (10, 13, '21:50:00', '21:55:00', 4),
  (10, 14, '23:10:00', '23:15:00', 5),
  (10, 2, '23:35:00', '23:45:00', 6),
  (10, 6, '06:15:00', '06:15:00', 7);
