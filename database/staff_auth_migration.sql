-- Sprint 4 Bonus: Tabbed Auth System Migration

-- Enhance Users Table for Staff Authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE DEFAULT NULL;
