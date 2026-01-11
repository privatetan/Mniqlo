# Database Deployment Guide

## Overview

This directory contains all SQL scripts needed to deploy and maintain the Mniqlo database.

## File Structure

```
database/
├── deployment.sql              # Complete deployment script (USE THIS FOR NEW DEPLOYMENTS)
├── crawler_schedules.sql       # Legacy: Crawler schedules table only
└── migrations/                 # Migration scripts for existing databases
    ├── 001_add_stock_status.sql
    ├── 002_add_composite_index.sql
    └── 003_add_notification_fields.sql
```

## Quick Start

### For New Deployments

1. Open Supabase SQL Editor
2. Run `deployment.sql`
3. Verify all tables were created

### For Existing Databases

Run migration scripts in order:

```sql
-- 1. Add stock_status column
\i migrations/001_add_stock_status.sql

-- 2. Add composite index
\i migrations/002_add_composite_index.sql

-- 3. Add notification fields
\i migrations/003_add_notification_fields.sql
```

## Database Schema

### Core Tables

1. **users** - User accounts
2. **favorites** - User favorite products
3. **monitor_tasks** - Stock monitoring tasks
4. **task_logs** - Task execution logs
5. **search_histories** - Search history
6. **notification_logs** - Notification history

### Crawler Tables

1. **crawled_products** - Crawled product data
2. **crawler_schedules** - Scheduled crawler configurations

### Subscription Tables

1. **super_push_subscriptions** - Super selection push subscriptions

## Indexes

All necessary indexes are created automatically by `deployment.sql`:

- Product lookups (product_id, code, gender)
- Composite index (code, size, color)
- Crawler schedules (gender, next_run_time)
- User subscriptions (user_id)

## Initial Data

Default crawler schedules are inserted for all categories:
- 女装 (disabled, 60 min interval)
- 男装 (disabled, 60 min interval)
- 童装 (disabled, 60 min interval)
- 婴幼儿装 (disabled, 60 min interval)

## Verification

After deployment, verify:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check default data
SELECT * FROM crawler_schedules;
```

## Troubleshooting

### Table Already Exists

All scripts use `IF NOT EXISTS` - safe to re-run.

### Index Already Exists

All index creations use `IF NOT EXISTS` - safe to re-run.

### Data Already Exists

Default data uses `ON CONFLICT DO NOTHING` - safe to re-run.

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-01-11 | Initial deployment script |
| 0.3.0 | 2026-01-09 | Added notification fields |
| 0.2.0 | 2026-01-09 | Added composite index |
| 0.1.0 | 2026-01-08 | Added stock_status column |
