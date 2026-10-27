# Vercel deployment

## Project setup

1. Import the `itconsultantbryant-svg/ULMC` repository in Vercel with the framework preset set to Next.js.
2. In Neon, use the `ulmc-varsity-pilot` project in `aws-us-east-1`. Create a separate branch for preview deployments if preview data must not share production data.
3. Add the environment variables below for Production. Add the same values for Preview only when preview deployments should use the same services.
4. Deploy, then run `npm run db:migrate` locally with the production Neon `DATABASE_URL` before opening the site.

## Environment variables

Use the Neon CLI without printing the value to retrieve the production pooled connection string. Pooling is required for Vercel's serverless runtime:

```bash
neon connection-string --pooled --project-id fragrant-term-52448867 --role-name ulmc_owner --database-name ulmc
```

Set these in Vercel. Values marked `generate` must be unique production secrets.

```dotenv
DATABASE_URL=<Neon pooled or direct PostgreSQL connection URI with sslmode=require>
NEXT_PUBLIC_SITE_URL=https://<your-vercel-domain>
BETTER_AUTH_URL=https://<your-vercel-domain>
BETTER_AUTH_TRUSTED_ORIGINS=https://vasitynews.vercel.app,https://varsitynewsonline.com
BETTER_AUTH_SECRET=<generate: openssl rand -base64 48>
MEDIA_SIGNING_SECRET=<generate: openssl rand -base64 48>
CRON_SECRET=<generate: openssl rand -hex 32>
SITE_NAME=The Varsity Pilot
EMAIL_DRIVER=smtp
EMAIL_FROM=The Varsity Pilot <masscommdept@ul.edu.lr>
SMTP_HOST=<provider-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<provider-user>
SMTP_PASSWORD=<provider-password>
STORAGE_DRIVER=s3
S3_ENDPOINT=<S3-compatible-endpoint>
S3_REGION=us-east-1
S3_BUCKET=<production-media-bucket>
S3_ACCESS_KEY_ID=<bucket-access-key>
S3_SECRET_ACCESS_KEY=<bucket-secret>
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_BASE_URL=<optional-public-cdn-url>
ANALYTICS_ACTIVE_WINDOW_MINUTES=5
ANALYTICS_RETENTION_DAYS=180
```

## Scheduled work on Vercel Hobby

Vercel Hobby only permits one Vercel Cron invocation per day, which is not sufficient for scheduled publishing and outbox delivery. This repository deliberately does not configure Vercel Cron.

Instead, the committed GitHub Actions workflow at `.github/workflows/worker-tick.yml` invokes the same secure worker endpoint every five minutes. In the GitHub repository, add these Actions secrets:

```dotenv
VERCEL_TICK_URL=https://<your-vercel-domain>/api/internal/tick
CRON_SECRET=<the exact same value configured in Vercel>
```

The endpoint processes queued publication, outbox, and maintenance work. Database row locks make overlapping requests safe. GitHub Actions schedules are best-effort and may run a few minutes late; use **Actions > Process scheduled work > Run workflow** to trigger it manually when needed.

For Vercel-managed environment setup, use `vercel env add <VARIABLE> production` for each secret rather than committing any `.env` file.

## Production database troubleshooting

If the deployed `/api/health` endpoint returns `503` or the public site shows a Server Components render error, Vercel cannot reach the production database. Fix the environment before investigating React or CSS:

1. In **Vercel > Project > Settings > Environment Variables**, replace `DATABASE_URL` for the **Production** environment with the pooled Neon URI from the command above. It must use the Neon hostname and end in `sslmode=require`; never use `localhost`, `127.0.0.1`, or a local `.pgdata` URI.
2. Confirm `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` are both `https://vasitynews.vercel.app` (or the final custom production domain).
3. Redeploy from the Vercel dashboard so the function receives the updated variables.
4. Open `https://vasitynews.vercel.app/api/health`. It must return `{ "ok": true, ... }` before testing the homepage or Studio.

The browser CSS preload message is non-fatal. It is a side effect of the server render aborting and will clear once the page renders successfully.

## Deployment verification

1. Open `/api/health` and confirm `{ "ok": true }`.
2. Sign in at `/studio/login`, create a draft, and verify the editorial workflow.
3. Add the two GitHub Actions secrets above, then run **Process scheduled work** manually and verify a successful run.
4. Publish or schedule a story and verify that it appears on the public site after the next worker tick.
5. Confirm production media uses S3-compatible storage. Local storage is not durable on Vercel.
