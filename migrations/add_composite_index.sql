-- Performance optimization: Add composite index for faster lookups
-- Run this in your Supabase SQL editor

-- Add composite index for code-size-color lookups (used in inventory comparison)
CREATE INDEX IF NOT EXISTS idx_crawled_products_composite 
ON crawled_products(code, size, color);

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'crawled_products'
ORDER BY indexname;
