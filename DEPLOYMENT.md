# Deployment Guide

This guide covers deploying the Mniqlo application using Supabase for persistent storage.

## Prerequisites

1.  **Supabase Project**: Create a new project at [supabase.com](https://supabase.com).
2.  **Environment Variables**: You will need your Supabase URL and Anon Key.
3.  **Docker**: Required for containerized deployment.

## Database Initialization

Before deploying the app, you must initialize the database structure in Supabase:

1.  Open your project on the Supabase Dashboard.
2.  Go to the **SQL Editor**.
3.  Create a "New Query".
4.  Copy the contents of `supabase_init.sql` from this repository and run it.

## Deployment Options

### Option 1: Docker Compose (Recommended)

1.  **Configure Environment**:
    Create a `.env` file on your server:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    WX_PUSH_URL=your_wx_push_url
    WX_PUSH_TOKEN=your_wx_push_token
    # ... other variables from .env.example
    ```

2.  **Start Services**:
    ```bash
    docker-compose up -d
    ```

3.  **Check Status**:
    ```bash
    docker-compose logs -f
    ```

### Option 2: Manual Docker Run

```bash
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="yours" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="yours" \
  -e WX_PUSH_URL="yours" \
  -e WX_PUSH_TOKEN="yours" \
  mniqlo-app
```

## Maintenance

### Updating the Database
Since we do not use foreign keys or database-level migrations (like Prisma), any schema updates should be applied manually via the Supabase SQL Editor. We recommend keep track of changes in version-controlled SQL scripts.

### Data Backups
Supabase automatically handles daily backups for Pro tier projects. For free tier, you can manually export data as SQL or CSV from the Supabase Table Editor.

## Security
- Always use **Environment Variables** for sensitive keys.
- Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the key used for client-side/public API access.
- For backend administrative tasks, the `X-Admin-User` header logic in our APIs provides an additional layer of security on top of the database role checks.
