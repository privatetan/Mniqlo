-- Migration: Add product fields to notification_logs table
-- Run this SQL in your Supabase SQL Editor

-- Add product_id column
ALTER TABLE notification_logs 
ADD COLUMN IF NOT EXISTS product_id TEXT;

-- Add style column
ALTER TABLE notification_logs 
ADD COLUMN IF NOT EXISTS style TEXT;

-- Add size column
ALTER TABLE notification_logs 
ADD COLUMN IF NOT EXISTS size TEXT;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notification_logs'
ORDER BY ordinal_position;
