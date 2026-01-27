-- Add main_pic column to crawled_products table
ALTER TABLE crawled_products ADD COLUMN IF NOT EXISTS main_pic TEXT;
COMMENT ON COLUMN crawled_products.main_pic IS '商品主图URL后缀 (如: /goods/12/34/56.jpg)';

-- Add main_pic column to favorites table
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS main_pic TEXT;
COMMENT ON COLUMN favorites.main_pic IS '商品主图URL后缀';
