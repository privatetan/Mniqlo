-- ============================================================================
-- Migration 003: Add Notification Fields
-- ============================================================================
-- Date: 2026-01-09
-- Description: Adds product fields to notification_logs table
-- ============================================================================

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
AND column_name IN ('product_id', 'style', 'size')
ORDER BY ordinal_position;
