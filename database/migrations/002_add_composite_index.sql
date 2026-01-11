-- ============================================================================
-- Migration 002: Add Composite Index
-- ============================================================================
-- Date: 2026-01-09
-- Description: Adds composite index for faster code-size-color lookups
-- ============================================================================

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
AND indexname = 'idx_crawled_products_composite';
