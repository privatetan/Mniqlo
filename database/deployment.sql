-- ============================================================================
-- Mniqlo Database Deployment Script
-- ============================================================================
-- Description: Complete database schema for Mniqlo application with detailed comments
-- Version: 1.1.0
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

COMMENT ON TABLE users IS '用户表：存储系统注册用户信息';
COMMENT ON COLUMN users.id IS '主键ID';
COMMENT ON COLUMN users.username IS '用户名 (唯一)';
COMMENT ON COLUMN users.password IS '加密后的密码';
COMMENT ON COLUMN users.role IS '用户角色 (USER: 普通用户, ADMIN: 管理员)';
COMMENT ON COLUMN users.wx_user_id IS '微信 OpenID (用于推送通知)';
COMMENT ON COLUMN users.notify_frequency IS '全局默认通知频率 (分钟)';
COMMENT ON COLUMN users.created_at IS '账号创建时间 (ISO 8601 String)';

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
    main_pic TEXT,
    timestamp TEXT NOT NULL
);

COMMENT ON TABLE favorites IS '用户收藏表：存储用户关注的商品';
COMMENT ON COLUMN favorites.id IS '主键ID';
COMMENT ON COLUMN favorites.user_id IS '关联用户ID';
COMMENT ON COLUMN favorites.product_id IS '商品ID (如: u0000000066997)';
COMMENT ON COLUMN favorites.code IS '6位商品货号 (如: 469746)';
COMMENT ON COLUMN favorites.name IS '商品名称';
COMMENT ON COLUMN favorites.color IS '商品颜色/款式';
COMMENT ON COLUMN favorites.size IS '商品尺码';
COMMENT ON COLUMN favorites.price IS '收藏时的价格';
COMMENT ON COLUMN favorites.timestamp IS '收藏时间 (ISO 8601 String)';

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

COMMENT ON TABLE monitor_tasks IS '监控任务表：存储具体的库存监控任务配置';
COMMENT ON COLUMN monitor_tasks.id IS '主键ID';
COMMENT ON COLUMN monitor_tasks.user_id IS '关联用户ID';
COMMENT ON COLUMN monitor_tasks.product_id IS '商品ID';
COMMENT ON COLUMN monitor_tasks.product_name IS '商品名称';
COMMENT ON COLUMN monitor_tasks.product_code IS '6位商品货号';
COMMENT ON COLUMN monitor_tasks.style IS '具体的颜色/款式';
COMMENT ON COLUMN monitor_tasks.size IS '具体的尺码';
COMMENT ON COLUMN monitor_tasks.target_price IS '目标价格 (暂未启用)';
COMMENT ON COLUMN monitor_tasks.frequency IS '监控检查频率 (秒)';
COMMENT ON COLUMN monitor_tasks.is_active IS '任务是否激活';
COMMENT ON COLUMN monitor_tasks.start_time IS '每日监控开始时间 (HH:mm)';
COMMENT ON COLUMN monitor_tasks.end_time IS '每日监控结束时间 (HH:mm)';
COMMENT ON COLUMN monitor_tasks.last_push_time IS '上次推送通知的时间';
COMMENT ON COLUMN monitor_tasks.created_at IS '任务创建时间';
COMMENT ON COLUMN monitor_tasks.updated_at IS '任务更新时间';

-- 1.4 Task Logs Table
-- Stores execution logs for monitoring tasks
CREATE TABLE IF NOT EXISTS task_logs (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT,
    message TEXT
);

COMMENT ON TABLE task_logs IS '任务日志表：记录监控任务的执行情况';
COMMENT ON COLUMN task_logs.id IS '主键ID';
COMMENT ON COLUMN task_logs.task_id IS '关联任务ID';
COMMENT ON COLUMN task_logs.timestamp IS '日志记录时间';
COMMENT ON COLUMN task_logs.status IS '执行状态 (SUCCESS/FAILURE)';
COMMENT ON COLUMN task_logs.message IS '日志详细信息 (如：有货、售罄、错误信息)';

-- 1.5 Search History Table
-- Stores user search queries
CREATE TABLE IF NOT EXISTS search_histories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    query TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

COMMENT ON TABLE search_histories IS '搜索历史表：记录用户的搜索关键词';
COMMENT ON COLUMN search_histories.id IS '主键ID';
COMMENT ON COLUMN search_histories.user_id IS '关联用户ID';
COMMENT ON COLUMN search_histories.query IS '搜索关键词';
COMMENT ON COLUMN search_histories.timestamp IS '搜索时间';

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

COMMENT ON TABLE notification_logs IS '通知日志表：记录已发送的推送通知';
COMMENT ON COLUMN notification_logs.id IS '主键ID';
COMMENT ON COLUMN notification_logs.user_id IS '接收用户ID';
COMMENT ON COLUMN notification_logs.title IS '通知标题';
COMMENT ON COLUMN notification_logs.content IS '通知内容';
COMMENT ON COLUMN notification_logs.product_id IS '关联商品ID';
COMMENT ON COLUMN notification_logs.style IS '关联款式';
COMMENT ON COLUMN notification_logs.size IS '关联尺码';
COMMENT ON COLUMN notification_logs.timestamp IS '发送时间';

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
    main_pic TEXT,                       -- Main product image URL suffix
    created_at TIMESTAMPTZ DEFAULT NOW() -- Creation timestamp
);

COMMENT ON TABLE crawled_products IS '爬虫数据表：存储从优衣库抓取的超值精选商品';
COMMENT ON COLUMN crawled_products.id IS '主键ID';
COMMENT ON COLUMN crawled_products.product_id IS '商品完整ID (如 u0000000066997)';
COMMENT ON COLUMN crawled_products.code IS '6位款号 (用于聚合)';
COMMENT ON COLUMN crawled_products.name IS '商品名称';
COMMENT ON COLUMN crawled_products.color IS '颜色/花色';
COMMENT ON COLUMN crawled_products.size IS '尺码';
COMMENT ON COLUMN crawled_products.price IS '当前折后价格';
COMMENT ON COLUMN crawled_products.min_price IS '历史最低价';
COMMENT ON COLUMN crawled_products.origin_price IS '商品原价';
COMMENT ON COLUMN crawled_products.stock IS '库存数量 (粗略值)';
COMMENT ON COLUMN crawled_products.stock_status IS '库存状态 (''new'': 本次爬取新增, ''old'': 存量数据)';
COMMENT ON COLUMN crawled_products.gender IS '所属分类 (女装/男装/童装/婴幼儿装)';
COMMENT ON COLUMN crawled_products.sku_id IS 'SKU唯一标识符';
COMMENT ON COLUMN crawled_products.created_at IS '数据抓取时间';

-- 2.2 Crawler Schedules Table
-- Stores scheduled crawler configurations for each category
CREATE TABLE IF NOT EXISTS crawler_schedules (
    id SERIAL PRIMARY KEY,
    gender VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    cron_expression TEXT NOT NULL DEFAULT '0 * * * *',
    last_run_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE crawler_schedules IS '爬虫调度表：配置各品类的自动抓取任务';
COMMENT ON COLUMN crawler_schedules.id IS '主键ID';
COMMENT ON COLUMN crawler_schedules.gender IS '品类名称 (唯一索引)';
COMMENT ON COLUMN crawler_schedules.is_enabled IS '是否启用自动抓取';
COMMENT ON COLUMN crawler_schedules.cron_expression IS 'Cron 表达式 (标准格式: 分 时 日 月 周，如 "*/30 * * * *" 表示每30分钟)';
COMMENT ON COLUMN crawler_schedules.last_run_time IS '上次成功执行时间';
COMMENT ON COLUMN crawler_schedules.created_at IS '配置创建时间';
COMMENT ON COLUMN crawler_schedules.updated_at IS '配置更新时间';

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

COMMENT ON TABLE super_push_subscriptions IS '超值推送配置表：用户的超值精选推送偏好';
COMMENT ON COLUMN super_push_subscriptions.id IS '主键ID';
COMMENT ON COLUMN super_push_subscriptions.user_id IS '关联用户ID';
COMMENT ON COLUMN super_push_subscriptions.is_enabled IS '全局推送开关';
COMMENT ON COLUMN super_push_subscriptions.channel IS '推送渠道 (默认 WECHAT)';
COMMENT ON COLUMN super_push_subscriptions.frequency IS '推送频率限制 (暂未深度使用)';
COMMENT ON COLUMN super_push_subscriptions.genders IS '订阅的品类数组';
COMMENT ON COLUMN super_push_subscriptions.updated_at IS '配置更新时间';

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
CREATE INDEX IF NOT EXISTS idx_crawler_schedules_enabled ON crawler_schedules(is_enabled) WHERE is_enabled = true;

-- 4.3 Super Push Subscriptions Indexes
CREATE INDEX IF NOT EXISTS idx_super_push_subscriptions_user_id ON super_push_subscriptions(user_id);

-- ============================================================================
-- SECTION 5: INITIAL DATA
-- ============================================================================

-- 5.1 Insert Default Crawler Schedules
-- Create default schedules for all categories (disabled by default)
-- Default cron: '0 * * * *' means every hour at minute 0
INSERT INTO crawler_schedules (gender, is_enabled, cron_expression) 
VALUES 
    ('女装', false, '0 * * * *'),
    ('男装', false, '0 * * * *'),
    ('童装', false, '0 * * * *'),
    ('婴幼儿装', false, '0 * * * *')
ON CONFLICT (gender) DO NOTHING;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
