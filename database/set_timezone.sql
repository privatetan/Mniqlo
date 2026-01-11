-- ============================================================================
-- Configuration: Set Database Timezone
-- ============================================================================
-- Description: Set the database timezone to Asia/Shanghai (UTC+8)
-- Note: This requires appropriate permissions. If run on a specific connection, It sets the session timezone.
-- To set it permanently for the database, use ALTER DATABASE.
-- ============================================================================

-- Set timezone for the current database
-- Replace 'postgres' with your actual database name if different, usually strictly 'postgres' in Supabase
ALTER DATABASE postgres SET timezone TO 'Asia/Shanghai';

-- Verify the change (this query shows the current setting)
SHOW timezone;
