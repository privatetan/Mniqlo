-- Crawler Schedules Table
-- This table stores scheduled crawler configurations for each gender category

CREATE TABLE IF NOT EXISTS crawler_schedules (
  id SERIAL PRIMARY KEY,
  gender VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_run_time TIMESTAMP,
  next_run_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index on gender to ensure one schedule per category
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawler_schedules_gender ON crawler_schedules(gender);

-- Create index on next_run_time for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_crawler_schedules_next_run ON crawler_schedules(next_run_time) WHERE is_enabled = true;

-- Insert default schedules for all categories (disabled by default)
INSERT INTO crawler_schedules (gender, is_enabled, interval_minutes) 
VALUES 
  ('女装', false, 60),
  ('男装', false, 60),
  ('童装', false, 60),
  ('婴幼儿装', false, 60)
ON CONFLICT (gender) DO NOTHING;
