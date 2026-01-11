-- ============================================================================
-- Mniqlo Database Deployment Script
-- ============================================================================
-- Description: Complete database schema for Mniqlo application
-- Version: 1.0.0
-- Date: 2026-01-11
-- Database: Supabase (PostgreSQL)
-- Time Zone: UTC+8 (Eastern Time Zone)
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

-- 1.1 Users Table
-- Stores user account information
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'USER',
    wx_user_id TEXT,
    notify_frequency INTEGER DEFAULT 60,
    created_at TEXT NOT NULL
);

-- 1.2 Favorites Table
-- Stores user favorite products
CREATE TABLE IF NOT EXISTS favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id TEXT NOT NULL,
    code TEXT,
    name TEXT,
    color TEXT,
    size TEXT,
    price DOUBLE PRECISION,
    timestamp TEXT NOT NULL
);

-- 1.3 Monitor Tasks Table
-- Stores user monitoring tasks for stock alerts
CREATE TABLE IF NOT EXISTS monitor_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT,
    product_code TEXT,
    style TEXT,
    size TEXT,
    target_price DOUBLE PRECISION,
    frequency INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    start_time TEXT,
    end_time TEXT,
    last_push_time TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 1.4 Task Logs Table
-- Stores execution logs for monitoring tasks
CREATE TABLE IF NOT EXISTS task_logs (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT,
    message TEXT
);

-- 1.5 Search History Table
-- Stores user search queries
CREATE TABLE IF NOT EXISTS search_histories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    query TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- 1.6 Notification Logs Table
-- Stores notification history
CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title TEXT,
    content TEXT,
    product_id TEXT,
    style TEXT,
    size TEXT,
    timestamp TEXT NOT NULL
);

-- ============================================================================
-- SECTION 2: CRAWLER TABLES
-- ============================================================================

-- 2.1 Crawled Products Table
-- Stores crawled product data from Uniqlo
CREATE TABLE IF NOT EXISTS crawled_products (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,            -- Product ID (e.g., u0000000066997)
    code TEXT NOT NULL,                  -- Product code (6-digit, e.g., 469746)
    name TEXT NOT NULL,                  -- Product name
    color TEXT,                          -- Color (style)
    size TEXT,                           -- Size
    price DOUBLE PRECISION,              -- Current price (varyPrice)
    min_price DOUBLE PRECISION,          -- Minimum price
    origin_price DOUBLE PRECISION,       -- Original price
    stock INTEGER DEFAULT 0,             -- Stock quantity
    stock_status TEXT DEFAULT 'new',     -- Stock status ('new': new stock, 'old': existing stock)
    gender TEXT,                         -- Gender category (女装/男装/童装/婴幼儿装)
    sku_id TEXT,                         -- SKU ID (unique SKU identifier)
    created_at TIMESTAMPTZ DEFAULT NOW() -- Creation timestamp
);

COMMENT ON COLUMN crawled_products.stock_status IS '库存状态 (''new'': 新增库存, ''old'': 现有库存)';

-- 2.2 Crawler Schedules Table
-- Stores scheduled crawler configurations for each category
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

-- ============================================================================
-- SECTION 3: SUBSCRIPTION TABLES
-- ============================================================================

-- 3.1 Super Selection Push Subscriptions
-- Stores user subscriptions for super selection notifications
CREATE TABLE IF NOT EXISTS super_push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,            -- Associated user ID
    is_enabled BOOLEAN DEFAULT FALSE,   -- Whether notifications are enabled
    channel TEXT DEFAULT 'WECHAT',      -- Notification channel (default: WeChat)
    frequency INTEGER DEFAULT 60,       -- Notification frequency (minutes)
    genders TEXT[] DEFAULT '{}',        -- Subscribed genders (['女装', '男装'], etc.)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

-- 4.1 Crawled Products Indexes
CREATE INDEX IF NOT EXISTS idx_crawled_products_product_id ON crawled_products(product_id);
CREATE INDEX IF NOT EXISTS idx_crawled_products_code ON crawled_products(code);
CREATE INDEX IF NOT EXISTS idx_crawled_products_gender ON crawled_products(gender);
CREATE INDEX IF NOT EXISTS idx_crawled_products_stock ON crawled_products(stock);
CREATE INDEX IF NOT EXISTS idx_crawled_products_composite ON crawled_products(code, size, color);

-- 4.2 Crawler Schedules Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawler_schedules_gender ON crawler_schedules(gender);
CREATE INDEX IF NOT EXISTS idx_crawler_schedules_next_run ON crawler_schedules(next_run_time) WHERE is_enabled = true;

-- 4.3 Super Push Subscriptions Indexes
CREATE INDEX IF NOT EXISTS idx_super_push_subscriptions_user_id ON super_push_subscriptions(user_id);

-- ============================================================================
-- SECTION 5: INITIAL DATA
-- ============================================================================

-- 5.1 Insert Default Crawler Schedules
-- Create default schedules for all categories (disabled by default)
INSERT INTO crawler_schedules (gender, is_enabled, interval_minutes) 
VALUES 
    ('女装', false, 60),
    ('男装', false, 60),
    ('童装', false, 60),
    ('婴幼儿装', false, 60)
ON CONFLICT (gender) DO NOTHING;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Verify all tables were created successfully
-- 2. Check indexes are in place
-- 3. Confirm default data was inserted
-- 4. Set up environment variables in your application
-- ============================================================================
