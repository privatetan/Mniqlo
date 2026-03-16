-- ============================================================================
-- Add limited time offer crawler feature
-- ============================================================================

CREATE TABLE IF NOT EXISTS limited_time_products (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    size TEXT,
    price DOUBLE PRECISION,
    min_price DOUBLE PRECISION,
    origin_price DOUBLE PRECISION,
    stock INTEGER DEFAULT 0,
    stock_status TEXT DEFAULT 'new',
    gender TEXT,
    sku_id TEXT,
    main_pic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE limited_time_products IS '爬虫数据表：存储从优衣库抓取的限时特优商品';
COMMENT ON COLUMN limited_time_products.gender IS '所属分类 (女装/男装/中性/男女同款/童装/婴幼儿装)';

CREATE TABLE IF NOT EXISTS limited_time_crawler_schedules (
    id SERIAL PRIMARY KEY,
    gender VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    interval_minutes INTEGER DEFAULT 60,
    cron_expression TEXT NOT NULL DEFAULT '0 * * * *',
    last_run_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE limited_time_crawler_schedules IS '限时特优调度表：配置各品类的自动抓取任务';

CREATE TABLE IF NOT EXISTS limited_time_push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    channel TEXT DEFAULT 'WECHAT',
    frequency INTEGER DEFAULT 60,
    genders TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE limited_time_push_subscriptions IS '限时特优推送配置表：用户的限时特优推送偏好';

CREATE INDEX IF NOT EXISTS idx_limited_time_products_product_id ON limited_time_products(product_id);
CREATE INDEX IF NOT EXISTS idx_limited_time_products_code ON limited_time_products(code);
CREATE INDEX IF NOT EXISTS idx_limited_time_products_gender ON limited_time_products(gender);
CREATE INDEX IF NOT EXISTS idx_limited_time_products_stock ON limited_time_products(stock);
CREATE INDEX IF NOT EXISTS idx_limited_time_products_composite ON limited_time_products(code, size, color);

CREATE UNIQUE INDEX IF NOT EXISTS idx_limited_time_crawler_schedules_gender ON limited_time_crawler_schedules(gender);
CREATE INDEX IF NOT EXISTS idx_limited_time_crawler_schedules_enabled ON limited_time_crawler_schedules(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_limited_time_push_subscriptions_user_id ON limited_time_push_subscriptions(user_id);

INSERT INTO limited_time_crawler_schedules (gender, is_enabled, interval_minutes, cron_expression)
VALUES
    ('女装', false, 60, '0 * * * *'),
    ('男装', false, 60, '0 * * * *'),
    ('中性/男女同款', false, 60, '0 * * * *'),
    ('童装', false, 60, '0 * * * *'),
    ('婴幼儿装', false, 60, '0 * * * *')
ON CONFLICT (gender) DO NOTHING;
