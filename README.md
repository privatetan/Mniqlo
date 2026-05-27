# Mniqlo

Mniqlo is a Next.js app for tracking Uniqlo products, favorites, crawler results, and WeChat stock notifications.

## Features

- Product search and favorites management
- Stock monitoring with user-defined intervals and time windows
- WeChat notification delivery and rate limiting
- Admin views for users, tasks, push settings, and crawler schedules
- Server-side crawler scheduling through `pg-boss`
- Supabase/PostgreSQL-backed data storage

## Stack

- Next.js 14 App Router
- React 18 + TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- pg-boss background jobs
- Docker / Docker Compose

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

Before running against a real environment, fill `.env` with Supabase, pg-boss, session, and WeChat values. Database schema SQL lives in `database/`.

## Commands

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # start built app
docker compose up --build
```

## Background Jobs

Crawler schedules are managed in `src/lib/jobs` with `pg-boss`. Set `PG_BOSS_DATABASE_URL` to a direct PostgreSQL connection string. Use `JOB_WORKER_ENABLED=false` on instances that should serve HTTP only.

## Project Layout

```text
src/app        Next.js pages and API routes
src/components Reusable UI components
src/hooks      Shared React hooks
src/lib        Supabase, crawlers, jobs, notifications, utilities
src/types      Shared TypeScript types
database       Database setup and migration SQL
public         Static assets
```

Deployment notes are in `DEPLOYMENT.md`.
