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
    timestamp TEXT NOT NULL
);
