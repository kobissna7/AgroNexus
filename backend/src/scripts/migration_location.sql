-- Migration: add GPS location columns to users table
-- Run in Supabase SQL Editor → New Query → Paste → Run

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_lat  DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS location_lng  DECIMAL(11, 8);

-- Index for geospatial queries (optional but useful)
CREATE INDEX IF NOT EXISTS idx_users_location
  ON users (location_lat, location_lng)
  WHERE location_lat IS NOT NULL;
