-- Migration 001: Add sub_role and home_station_id columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_role VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_station_id INTEGER REFERENCES stations(id);
