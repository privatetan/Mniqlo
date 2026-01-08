-- Supabase Database Initialization Script
-- Forced Time Zone: Eastern Time Zone (UTC+8)
-- Relations: Primary Key only (No Foreign Keys)

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'USER',
    wx_user_id TEXT,
    notify_frequency INTEGER DEFAULT 60,
    created_at TEXT NOT NULL
);

-- 2. Favorites table
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

-- 3. Monitor Tasks table
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

-- 4. Task Logs table
CREATE TABLE IF NOT EXISTS task_logs (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT,
    message TEXT
);

-- 5. Search History table
CREATE TABLE IF NOT EXISTS search_histories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    query TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- 6. Notification Logs table
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

-- 7. Crawled Products table (爬虫抓取的商品数据)
CREATE TABLE IF NOT EXISTS crawled_products (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,            -- 商品ID (产品代码，例如: u0000000066997)
    code TEXT NOT NULL,                  -- 货号 (6位数字代码，例如: 469746)
    name TEXT NOT NULL,                  -- 商品名称
    color TEXT,                          -- 颜色 (style)
    size TEXT,                           -- 尺寸
    price DOUBLE PRECISION,              -- 当前价格 (varyPrice)
    min_price DOUBLE PRECISION,          -- 最低价格
    origin_price DOUBLE PRECISION,       -- 原价
    stock INTEGER DEFAULT 0,             -- 库存数量
    gender TEXT,                         -- 性别 (男装/女装/童装等)
    sku_id TEXT,                         -- SKU ID (唯一SKU标识)
    created_at TIMESTAMPTZ DEFAULT NOW() -- 创建时间
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_crawled_products_product_id ON crawled_products(product_id);
CREATE INDEX IF NOT EXISTS idx_crawled_products_code ON crawled_products(code);
CREATE INDEX IF NOT EXISTS idx_crawled_products_gender ON crawled_products(gender);
CREATE INDEX IF NOT EXISTS idx_crawled_products_stock ON crawled_products(stock);
