import { sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/server/db/client";
import {
  claimJob,
  completeJob,
  failJobById,
  recoverStaleJobs,
  type ClaimedJob,
} from "@/server/jobs";
import {
  claimOutboxBatch,
  completeOutbox,
  failOutbox,
  notifyNow,
  PUBLIC_EVENTS_CHANNEL,
  type OutboxRow,
} from "@/server/outbox";
import { processScheduledPublication } from "@/server/workflow/service";

const WORKER_ID = env.workerId;
const POLL_MS = Math.max(250, env.workerPollMs);

let stopping = false;

function log(message: string, extra?: unknown) {
  if (extra === undefined) console.info(`[worker ${WORKER_ID}] ${message}`);
  else console.info(`[worker ${WORKER_ID}] ${message}`, extra);
}

function warn(message: string, extra?: unknown) {
  console.warn(`[worker ${WORKER_ID}] ${message}`, extra ?? "");
}

async function requestRevalidation(paths: string[]): Promise<void> {
  if (!env.cronSecret) {
    warn("CRON_SECRET is not set; skipping cross-instance revalidation webhook.");
    return;
  }
  const response = await fetch(`${env.siteUrl}/api/internal/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-secret": env.cronSecret },
    body: JSON.stringify({ paths }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Revalidation webhook returned ${response.status}`);
  }
}

async function handleOutboxEvent(row: OutboxRow): Promise<void> {
  const payload = row.payload ?? {};
  const slug = typeof payload.slug === "string" ? payload.slug : undefined;
  switch (row.event_type) {
    case "article.published":
    case "article.unpublished":
    case "article.updated": {
      const paths = ["/", "/newsroom", "/search", ...(slug ? [`/news/${slug}`] : [])];
      await requestRevalidation(paths);
      await notifyNow(PUBLIC_EVENTS_CHANNEL, {
        type: row.event_type,
        slug: slug ?? null,
        at: new Date().toISOString(),
      });
      return;
    }
    case "settings.updated":
      await requestRevalidation(["/"]);
      return;
    default:
      warn(`Unknown outbox event type "${row.event_type}"; marking done.`);
  }
}

async function drainOutbox(): Promise<number> {
  const rows = await claimOutboxBatch(50);
  for (const row of rows) {
    try {
      await handleOutboxEvent(row);
      await completeOutbox(row.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`Outbox ${row.id} (${row.event_type}) failed: ${message}`);
      await failOutbox(row, message);
    }
  }
  return rows.length;
}

async function purgeAnalytics(): Promise<void> {
  const days = Math.max(7, env.analyticsRetentionDays);
  await db.execute(
    sql`DELETE FROM analytics_event WHERE created_at < now() - (${days}::text || ' days')::interval`,
  );
  await db.execute(
    sql`DELETE FROM analytics_search WHERE created_at < now() - (${days}::text || ' days')::interval`,
  );
  await db.execute(
    sql`DELETE FROM analytics_session WHERE started_at < now() - (${days}::text || ' days')::interval`,
  );
}

async function handleJob(job: ClaimedJob): Promise<void> {
  switch (job.type) {
    case "publish_scheduled": {
      const scheduleId = typeof job.payload.scheduleId === "string" ? job.payload.scheduleId : "";
      if (!scheduleId) throw new Error("publish_scheduled job is missing scheduleId");
      const result = await processScheduledPublication(scheduleId);
      log(`Scheduled publication ${scheduleId}: ${result.status}`);
      return;
    }
    case "purge_analytics":
      await purgeAnalytics();
      log("Analytics retention purge complete");
      return;
    case "aggregate_analytics":
      // Dashboard metrics are computed on demand from raw events; this job is
      // reserved for future rollups and intentionally a no-op.
      return;
    default:
      throw new Error(`Unsupported job type "${job.type}"`);
  }
}

export async function runWorkerOnce(): Promise<{ outbox: number; jobs: number }> {
  await recoverStaleJobs();
  const outbox = await drainOutbox();
  let jobs = 0;
  for (let i = 0; i < 10; i += 1) {
    const job = await claimJob(WORKER_ID);
    if (!job) break;
    jobs += 1;
    try {
      await handleJob(job);
      await completeJob(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`Job ${job.id} (${job.type}) failed: ${message}`);
      await failJobById(job.id, job.attempts, job.maxAttempts, message);
    }
  }
  return { outbox, jobs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  log(`started; polling every ${POLL_MS}ms`);
  while (!stopping) {
    try {
      await runWorkerOnce();
    } catch (error) {
      warn("Worker tick failed", error);
    }
    await sleep(POLL_MS);
  }
  log("stopped");
}

if (process.argv[1] && /worker[\\/]index\.(ts|js)$/.test(process.argv[1])) {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      log(`${signal} received; finishing current tick`);
      stopping = true;
    });
  }
  void main().catch((error) => {
    console.error("[worker] fatal", error);
    process.exit(1);
  });
}
