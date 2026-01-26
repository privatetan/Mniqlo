# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/` and follows the Next.js App Router. Pages, layouts, and API routes are under `src/app`, with API handlers in paths like `src/app/api/search/route.ts`. Reusable UI is in `src/app/components` (e.g., `FavoritePage.tsx`), shared hooks in `src/hooks`, and integrations/utilities in `src/lib` (e.g., `supabase.ts`, `date-utils.ts`). Shared types live in `src/types`. Static assets belong in `public/`. Database setup SQL is in `database/`, and deployment details live in `DEPLOYMENT.md`.

## Build, Test, and Development Commands
- `npm run dev` starts the local Next.js dev server on `http://localhost:3000`.
- `npm run build` creates the production build.
- `npm run start` runs the production server from the build output.
- `docker-compose up --build` runs the containerized app (see `docker-compose.yml`).

## Coding Style & Naming Conventions
Use TypeScript/React with 2-space indentation and single quotes, matching existing files in `src/app`. Components use `PascalCase` filenames and exports (`src/app/components/Header.tsx`). Hooks use the `useX` prefix and live in `src/hooks` (`useScheduledTask.ts`). Utilities in `src/lib` are lowercase or kebab-case (`cron-utils.ts`). Route segments under `src/app` use lowercase directories (e.g., `src/app/admin/users`).

## Testing Guidelines
No test runner is configured in `package.json`, and no tests are present. If you add tests, use `.test.ts`/`.test.tsx` naming and place them alongside the module or under `src/__tests__`, then add the corresponding test script to `package.json`.

## Commit & Pull Request Guidelines
Recent commits use Conventional Commits-style prefixes (`feat:`, `fix:`, `refactor:`) with short, descriptive subjects, sometimes in Chinese. Follow that pattern. PRs should include a concise summary, testing performed (e.g., `npm run dev` + manual checks), and screenshots for UI changes; link relevant issues when applicable.

## Configuration & Secrets
Copy `.env.example` to `.env` and fill in Supabase and WeChat credentials. Do not commit secrets. When changing config, document new variables in `README.md` or `DEPLOYMENT.md`.
