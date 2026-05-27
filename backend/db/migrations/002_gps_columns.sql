-- Migration 002: Add GPS columns to trip_status_updates
ALTER TABLE trip_status_updates ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE trip_status_updates ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE trip_status_updates ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION;
ALTER TABLE trip_status_updates ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION;
ALTER TABLE trip_status_updates ADD COLUMN IF NOT EXISTS gps_source VARCHAR(20) DEFAULT 'manual';

-- Re-enforce unique constraint on (schedule_id, trip_date) in case it was dropped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_trip_status'
      AND conrelid = 'trip_status_updates'::regclass
  ) THEN
    ALTER TABLE trip_status_updates ADD CONSTRAINT uq_trip_status UNIQUE (schedule_id, trip_date);
  END IF;
END $$;
