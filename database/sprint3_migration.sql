-- Sprint 3 Database Migrations

-- Add GPS coordinate columns to TripStatusUpdate
ALTER TABLE TripStatusUpdate 
ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8);

-- Add notification preferences to JourneyWatch
ALTER TABLE JourneyWatch
ADD COLUMN IF NOT EXISTS notify_delays BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_departure BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_cancellations BOOLEAN DEFAULT TRUE;
