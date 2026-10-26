import { and, eq, gte, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { advertisement, article, articleRevision, articleRevisionMedia, mediaAsset } from "@/server/db/schema";
import { env } from "@/lib/env";

export const MEDIA_ROOT = ".data/media";

export function isSafeStorageKey(key: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(key) && !key.includes("..");
}

export async function getMediaById(id: string) {
  const rows = await db.select().from(mediaAsset).where(eq(mediaAsset.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function isMediaPublic(id: string): Promise<boolean> {
  const rows = await db
    .select({ isPrivate: mediaAsset.isPrivate })
    .from(mediaAsset)
    .where(eq(mediaAsset.id, id))
    .limit(1);
  if (!rows[0]) return false;
  if (!rows[0].isPrivate) return true;
  const now = new Date();
  const activeAd = await db
    .select({ id: advertisement.id })
    .from(advertisement)
    .where(
      and(
        eq(advertisement.mediaId, id),
        eq(advertisement.isActive, true),
        or(isNull(advertisement.startsAt), lte(advertisement.startsAt, now)),
        or(isNull(advertisement.endsAt), gte(advertisement.endsAt, now)),
      ),
    )
    .limit(1);
  if (activeAd.length > 0) return true;
  const published = await db
    .select({ id: articleRevisionMedia.mediaId })
    .from(articleRevisionMedia)
    .innerJoin(articleRevision, eq(articleRevision.id, articleRevisionMedia.revisionId))
    .innerJoin(article, eq(article.publishedRevisionId, articleRevision.id))
    .where(
      and(
        eq(articleRevisionMedia.mediaId, id),
        isNotNull(article.publishedRevisionId),
        isNull(article.unpublishedAt),
      ),
    )
    .limit(1);
  return published.length > 0;
}

export async function isMediaAttachedToOwnedDraft(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: articleRevisionMedia.mediaId })
    .from(articleRevisionMedia)
    .innerJoin(articleRevision, eq(articleRevision.id, articleRevisionMedia.revisionId))
    .innerJoin(article, eq(article.id, articleRevision.articleId))
    .where(
      and(
        eq(articleRevisionMedia.mediaId, id),
        eq(article.createdBy, userId),
        sql`${article.publishedRevisionId} is distinct from ${articleRevision.id}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export function mediaStoragePath(storageKey: string): string {
  return `${env.storageDriver === "s3" ? "s3" : "local"}:${storageKey}`;
}
