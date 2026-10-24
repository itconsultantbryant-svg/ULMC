import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { job } from "@/server/db/schema";
import type { Executor } from "@/server/db/executor";

export type JobType =
  | "publish_scheduled"
  | "send_email"
  | "process_media"
  | "aggregate_analytics"
  | "purge_analytics"
  | "rebuild_search"
  | "deliver_outbox";

export type EnqueueInput = {
  type: JobType;
  payload?: Record<string, unknown>;
  runAt?: Date;
  idempotencyKey?: string;
  maxAttempts?: number;
};

export async function enqueueJob(executor: Executor, input: EnqueueInput): Promise<void> {
  await executor
    .insert(job)
    .values({
      type: input.type,
      payload: input.payload ?? {},
      runAt: input.runAt ?? new Date(),
      idempotencyKey: input.idempotencyKey ?? null,
      maxAttempts: input.maxAttempts ?? 8,
    })
    .onConflictDoNothing();
}

export type ClaimedJob = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string | null;
};

/**
 * Claim one due job using FOR UPDATE SKIP LOCKED. Safe to run in parallel
 * workers: each row can only be claimed once.
 */
export async function claimJob(workerId: string): Promise<ClaimedJob | null> {
  const rows = await db.execute<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
    idempotency_key: string | null;
  }>(sql`
    UPDATE job
    SET status = 'processing', locked_at = now(), locked_by = ${workerId},
        attempts = attempts + 1, updated_at = now()
    WHERE id = (
      SELECT id FROM job
      WHERE status = 'pending' AND run_at <= now()
      ORDER BY run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, type, payload, attempts, max_attempts, idempotency_key
  `);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    idempotencyKey: row.idempotency_key,
  };
}

export async function completeJob(jobId: string): Promise<void> {
  await db
    .update(job)
    .set({ status: "done", lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(eq(job.id, jobId));
}

export async function failJobById(
  jobId: string,
  attempts: number,
  maxAttempts: number,
  error: string,
): Promise<void> {
  const exhausted = attempts >= maxAttempts;
  await db
    .update(job)
    .set({
      status: exhausted ? "failed" : "pending",
      lockedAt: null,
      lockedBy: null,
      lastError: error.slice(0, 2000),
      runAt: exhausted ? undefined : new Date(Date.now() + Math.min(300_000, 2 ** attempts * 1000)),
      updatedAt: new Date(),
    })
    .where(eq(job.id, jobId));
}

export async function recoverStaleJobs(): Promise<void> {
  await db
    .update(job)
    .set({ status: "pending", lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(
      and(
        eq(job.status, "processing"),
        lte(job.lockedAt, new Date(Date.now() - 10 * 60 * 1000)),
      ),
    );
}
