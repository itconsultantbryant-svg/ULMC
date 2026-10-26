import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { advertisement, auditLog, mediaAsset } from "@/server/db/schema";
import { invalidatePublicContent } from "@/server/cache";
import { HttpError } from "@/server/http";
import { can } from "@/server/permissions";
import type { StaffUser } from "@/server/session";

export type AdvertisementInput = {
  title?: unknown;
  body?: unknown;
  mediaId?: unknown;
  destinationUrl?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  isActive?: unknown;
  orderIndex?: unknown;
};

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
function date(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, `${label} is not a valid date.`);
  return parsed;
}

async function values(input: AdvertisementInput) {
  const title = text(input.title, 120);
  if (title.length < 2) throw new HttpError(400, "Enter an advertisement title.");
  const mediaId = text(input.mediaId, 36) || null;
  if (mediaId) {
    const [media] = await db.select({ id: mediaAsset.id }).from(mediaAsset).where(eq(mediaAsset.id, mediaId)).limit(1);
    if (!media) throw new HttpError(400, "Select a media item from the library.");
  }
  const startsAt = date(input.startsAt, "Start date");
  const endsAt = date(input.endsAt, "End date");
  if (startsAt && endsAt && endsAt < startsAt) throw new HttpError(400, "End date must be after start date.");
  const destinationUrl = text(input.destinationUrl, 500);
  return {
    title,
    body: text(input.body, 600),
    mediaId,
    destinationUrl: /^https?:\/\//i.test(destinationUrl) ? destinationUrl : null,
    startsAt,
    endsAt,
    isActive: Boolean(input.isActive),
    orderIndex: Math.max(0, Math.min(999, Number(input.orderIndex) || 0)),
  };
}

export async function createAdvertisement(actor: StaffUser, input: AdvertisementInput) {
  if (!can(actor, "advertising.manage")) throw new HttpError(403, "You cannot manage advertisements.");
  const data = await values(input);
  const [created] = await db.insert(advertisement).values({ ...data, createdBy: actor.id }).returning({ id: advertisement.id });
  if (!created) throw new HttpError(500, "Could not create advertisement.");
  await db.insert(auditLog).values({ actorId: actor.id, action: "advertisement.created", entityType: "advertisement", entityId: created.id, metadata: { title: data.title } });
  await invalidatePublicContent(["/"]);
  return created;
}

export async function updateAdvertisement(actor: StaffUser, id: string, input: AdvertisementInput) {
  if (!can(actor, "advertising.manage")) throw new HttpError(403, "You cannot manage advertisements.");
  const [existing] = await db.select().from(advertisement).where(eq(advertisement.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Advertisement not found.");
  const data = await values({ ...existing, ...input });
  await db.update(advertisement).set({ ...data, updatedAt: new Date() }).where(eq(advertisement.id, id));
  await db.insert(auditLog).values({ actorId: actor.id, action: "advertisement.updated", entityType: "advertisement", entityId: id, metadata: { title: data.title } });
  await invalidatePublicContent(["/"]);
}

export async function deleteAdvertisement(actor: StaffUser, id: string) {
  if (!can(actor, "advertising.manage")) throw new HttpError(403, "You cannot manage advertisements.");
  await db.delete(advertisement).where(eq(advertisement.id, id));
  await db.insert(auditLog).values({ actorId: actor.id, action: "advertisement.deleted", entityType: "advertisement", entityId: id });
  await invalidatePublicContent(["/"]);
}

export async function getVisibleAdvertisements(limit = 3) {
  const now = new Date();
  try {
    return await db
      .select({
        id: advertisement.id,
        title: advertisement.title,
        body: advertisement.body,
        destinationUrl: advertisement.destinationUrl,
        mediaId: advertisement.mediaId,
        mimeType: mediaAsset.mimeType,
        alt: mediaAsset.alt,
      })
      .from(advertisement)
      .leftJoin(mediaAsset, eq(mediaAsset.id, advertisement.mediaId))
      .where(
        and(
          eq(advertisement.isActive, true),
          or(isNull(advertisement.startsAt), lte(advertisement.startsAt, now)),
          or(isNull(advertisement.endsAt), gte(advertisement.endsAt, now)),
        ),
      )
      .orderBy(asc(advertisement.orderIndex), asc(advertisement.createdAt))
      .limit(limit);
  } catch (error) {
    // Advertising is optional public content. In particular, do not make the
    // homepage unavailable while a deployment's database migration is pending.
    console.error("Failed to load visible advertisements", error);
    return [];
  }
}
