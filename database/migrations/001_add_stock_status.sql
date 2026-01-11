-- ============================================================================
-- Migration 001: Add stock_status Column
-- ============================================================================
-- Date: 2026-01-08
-- Description: Adds stock_status column to crawled_products table
-- ============================================================================

-- Add the stock_status column with default value 'new'
ALTER TABLE crawled_products 
ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'new';

-- Add a comment to document the column
COMMENT ON COLUMN crawled_products.stock_status IS '库存状态 (''new'': 新增库存, ''old'': 现有库存)';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'crawled_products' 
AND column_name = 'stock_status';
