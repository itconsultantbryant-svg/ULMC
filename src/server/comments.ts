import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLog, article, commentModerationAction, publicComment } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { can } from "@/server/permissions";
import type { StaffUser } from "@/server/session";

export type ModerationAction = "approve" | "reject" | "spam" | "delete";

const STATUS_BY_ACTION: Record<ModerationAction, string> = {
  approve: "approved",
  reject: "rejected",
  spam: "spam",
  delete: "deleted",
};

export async function moderateComment(
  actor: Pick<StaffUser, "id" | "roles">,
  params: { commentId: string; action: ModerationAction; reason?: string },
): Promise<{ status: string; articleSlug: string | null }> {
  if (!can(actor, "comments.moderate")) {
    throw new HttpError(403, "You do not have permission to moderate comments.");
  }
  if (!(params.action in STATUS_BY_ACTION)) {
    throw new HttpError(400, "Unknown moderation action.");
  }

  return db.transaction(async (tx) => {
    const [comment] = await tx
      .select({
        id: publicComment.id,
        articleId: publicComment.articleId,
        status: publicComment.status,
      })
      .from(publicComment)
      .where(eq(publicComment.id, params.commentId))
      .limit(1);
    if (!comment) throw new HttpError(404, "Comment not found.");

    const nextStatus = STATUS_BY_ACTION[params.action];
    const reason = params.reason?.trim() || null;

    await tx
      .update(publicComment)
      .set({
        status: nextStatus,
        moderatedBy: actor.id,
        moderatedAt: new Date(),
        moderationNote: reason,
      })
      .where(eq(publicComment.id, comment.id));

    await tx.insert(commentModerationAction).values({
      commentId: comment.id,
      actorId: actor.id,
      action: params.action,
      reason,
    });

    await tx.insert(auditLog).values({
      actorId: actor.id,
      action: `comment.${params.action}`,
      entityType: "comment",
      entityId: comment.id,
      articleId: comment.articleId,
      fromStatus: comment.status,
      toStatus: nextStatus,
      reason,
      metadata: {},
    });

    const [articleRow] = await tx
      .select({ slug: article.slug })
      .from(article)
      .where(eq(article.id, comment.articleId))
      .limit(1);

    return { status: nextStatus, articleSlug: articleRow?.slug ?? null };
  });
}


