import { eq, sql } from "drizzle-orm";
import { db, sqlClient } from "@/server/db/client";
import { publicationOutbox } from "@/server/db/schema";
import type { Executor } from "@/server/db/executor";

export const PUBLIC_EVENTS_CHANNEL = "ulmc_public_events";
export const ANALYTICS_CHANNEL = "ulmc_analytics_events";

export type OutboxInput = {
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export async function enqueueOutbox(executor: Executor, input: OutboxInput): Promise<void> {
  await executor
    .insert(publicationOutbox)
    .values({
      eventType: input.eventType,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
    })
    .onConflictDoNothing();
}

/**
 * Best-effort immediate wake-up. Delivery is still guaranteed by the outbox
 * table and the worker, so a failure here never loses an event.
 */
export async function notifyNow(channel: string, payload: unknown): Promise<void> {
  try {
    await sqlClient.notify(channel, JSON.stringify(payload));
  } catch {
    // outbox retry will deliver it
  }
}

export type OutboxRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

export async function claimOutboxBatch(limit = 20): Promise<OutboxRow[]> {
  const rows = await db.execute<OutboxRow>(sql`
    UPDATE publication_outbox
    SET status = 'processing', attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM publication_outbox
      WHERE status = 'pending' AND available_at <= now()
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING id, event_type, payload, attempts
  `);
  return [...rows];
}

export async function completeOutbox(id: string): Promise<void> {
  await db
    .update(publicationOutbox)
    .set({ status: "done", processedAt: new Date(), lastError: null })
    .where(eq(publicationOutbox.id, id));
}

export async function failOutbox(row: OutboxRow, error: string): Promise<void> {
  const attempts = row.attempts;
  const exhausted = attempts >= 12;
  await db
    .update(publicationOutbox)
    .set({
      status: exhausted ? "failed" : "pending",
      lastError: error.slice(0, 2000),
      availableAt: new Date(Date.now() + Math.min(300_000, 2 ** attempts * 1000)),
    })
    .where(eq(publicationOutbox.id, row.id));
}
