# Vercel deployment

## Project setup

1. Import the `itconsultantbryant-svg/ULMC` repository in Vercel with the framework preset set to Next.js.
2. In Neon, use the `ulmc-varsity-pilot` project in `aws-us-east-1`. Create a separate branch for preview deployments if preview data must not share production data.
3. Add the environment variables below for Production. Add the same values for Preview only when preview deployments should use the same services.
4. Deploy, then run `npm run db:migrate` locally with the production Neon `DATABASE_URL` before opening the site.

## Environment variables

Use the Neon CLI without printing the value to retrieve the production connection string:

```bash
neon connection-string --project-id fragrant-term-52448867 --role-name ulmc_owner --database-name ulmc
```

Set these in Vercel. Values marked `generate` must be unique production secrets.

```dotenv
DATABASE_URL=<Neon pooled or direct PostgreSQL connection URI with sslmode=require>
NEXT_PUBLIC_SITE_URL=https://<your-vercel-domain>
BETTER_AUTH_URL=https://<your-vercel-domain>
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

`CRON_SECRET` authorizes the Vercel cron call to `/api/internal/tick`. The cron runs every five minutes and safely processes queued publishing, outbox, and maintenance work. Database row locks ensure that an accidental overlapping request does not duplicate work.

For Vercel-managed environment setup, use `vercel env add <VARIABLE> production` for each secret rather than committing any `.env` file.

## Deployment verification

1. Open `/api/health` and confirm `{ "ok": true }`.
2. Sign in at `/studio/login`, create a draft, and verify the editorial workflow.
3. Publish or schedule a story and verify that it appears on the public site after the next cron tick.
4. Confirm production media uses S3-compatible storage. Local storage is not durable on Vercel.
