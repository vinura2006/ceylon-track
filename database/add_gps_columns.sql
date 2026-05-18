-- ============================================
-- GPS Columns Migration for TripStatusUpdate
-- Adds current_lat and current_lng for tracking
-- ============================================

ALTER TABLE TripStatusUpdate ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8);
ALTER TABLE TripStatusUpdate ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8);

-- Create index for geographic queries
CREATE INDEX IF NOT EXISTS idx_tripstatus_location ON TripStatusUpdate(current_lat, current_lng);

-- Add comment
COMMENT ON COLUMN TripStatusUpdate.current_lat IS 'Current latitude of the train (WGS84)';
COMMENT ON COLUMN TripStatusUpdate.current_lng IS 'Current longitude of the train (WGS84)';
