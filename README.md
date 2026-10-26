# The Varsity Pilot — University of Liberia

The student newspaper and academic platform of the Department of Communication and Media Studies (Next.js 15, Drizzle, Better Auth).

## Quick start
1. Copy `.env.example` to `.env` and configure.
2. Start local Postgres on 5433 (`npm run db:pg:start` if using `.pgdata`).
3. Run migrations: `npm run db:migrate`
4. First-time setup: visit `/setup?token=...` using `SETUP_TOKEN` from `.env`/`.data/setup-token.txt`, or seed demo user with `npm run db:seed`.
5. Dev: `npm run dev` (app), `npm run dev:worker` (outbox/scheduler).

All database and worker scripts load `.env` automatically via `tsx --env-file=.env`.

## Scripts
- `npm run dev` / `npm run build` / `npm run start`
- `npm run worker`
- `npm run db:migrate` / `npm run db:seed`
- `npm run typecheck` / `npm run lint` / `npm run test`

## Notes
- Workflow enforces separation of duties (author cannot approve own story).
- Two-factor required for privileged roles when enabled in settings.
- Media served via `/media/[id]`; private assets require auth.
- The development seed creates `admin@vasitynewsonline.com` as an administrator. Its password is `DEMO_ADMIN_PASSWORD` when set, otherwise `ChangeMe123@`; change it before using a shared environment.
- Deployment details, Vercel environment variables, and the serverless worker cron are in [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md).
