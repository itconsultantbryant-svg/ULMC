# Architecture

## Overview
Next.js 15 App Router, TypeScript strict, Tailwind CSS v4, Drizzle ORM + Postgres, Better Auth, server-enforced editorial workflow with separation of duties, local/S3 media, outbox + worker + pg_notify, in-memory tagged cache with webhook revalidation for multi-instance.

## Key paths
- `(public)/` public site, `(studio)/` editorial workspace, `(auth)/` auth routes
- `src/server/workflow/` state machine, validation, service
- `src/server/studio/queries.ts` studio read layer
- `src/server/outbox.ts`, `src/jobs.ts`, `src/worker/index.ts`
- `src/server/analytics/` collection and live stream

## Notes
- Cache is in-process; use the worker + `/api/internal/revalidate` webhook in multi-instance deployments.
- Revisions immutable once locked; publishing requires editorial approval and admin approval.
- Media private by default; public URL `/media/[id]`.
