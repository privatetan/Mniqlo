# Deployment

Mniqlo runs as a standalone Next.js container and uses Supabase/PostgreSQL for storage and `pg-boss` jobs.

## Prepare

1. Run the SQL files in `database/` from the Supabase SQL Editor.
2. Copy `.env.example` to `.env` on the server.
3. Fill Supabase, pg-boss, session, and WeChat values.

`PG_BOSS_DATABASE_URL` must be a PostgreSQL connection string, not the Supabase anon key.

## Docker Compose

```bash
docker compose up -d --build
docker compose logs -f app
```

The app listens on container port `3000`. Set `APP_PORT` in `.env` to change the host port; the default is `13300`.

## Runtime Notes

- `JOB_WORKER_ENABLED=true` lets this container process pg-boss jobs.
- Use `JOB_WORKER_ENABLED=false` for HTTP-only replicas.
- Keep `.env` out of git; it contains database and WeChat secrets.
