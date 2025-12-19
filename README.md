# Next.js Fullstack Starter

Minimal Next.js (App Router) + Prisma (SQLite) starter.

Quick start:

```bash
cd nextjs-fullstack
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Seed data (optional):

```bash
npm run db:seed
```

Notes:
- Database is SQLite and stored in `prisma/dev.db` (see `.env`).
- API routes live under `app/api/articles/route.ts`.
- Frontend page is `app/page.tsx` with a simple create form component at `app/components/PostForm.tsx`.
