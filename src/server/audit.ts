import { auditLog } from "@/server/db/schema";
import type { Executor } from "@/server/db/executor";

export type AuditInput = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  articleId?: string | null;
  revisionId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
};

/**
 * Append-only audit record. There is deliberately no update or delete helper;
 * a database trigger also rejects mutation of audit rows.
 */
export async function recordAudit(executor: Executor, input: AuditInput): Promise<void> {
  await executor.insert(auditLog).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    articleId: input.articleId ?? null,
    revisionId: input.revisionId ?? null,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
    ipHash: input.ipHash ?? null,
  });
}
