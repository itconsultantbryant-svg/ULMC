import { and, eq, ne } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLog, event } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { slugify } from "@/server/ids";
import { can } from "@/server/permissions";
import { sanitizeArticleHtml } from "@/server/sanitize";
import type { StaffUser } from "@/server/session";

export type EventInput = {
  title?: unknown;
  slug?: unknown;
  summary?: unknown;
  descriptionHtml?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  venue?: unknown;
  organizer?: unknown;
  registrationUrl?: unknown;
  isPublished?: unknown;
  isFeatured?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function date(value: unknown, field: string, required: boolean): Date | null {
  if (value === null || value === undefined || value === "") {
    if (required) throw new HttpError(400, `${field} is required.`);
    return null;
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, `${field} is not a valid date.`);
  return parsed;
}

async function resolveSlug(title: string, requested: unknown, exceptId?: string): Promise<string> {
  const base = slugify(typeof requested === "string" && requested.trim() ? requested : title);
  if (!base) throw new HttpError(400, "Enter a valid slug.");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: event.id })
      .from(event)
      .where(exceptId ? and(eq(event.slug, candidate), ne(event.id, exceptId)) : eq(event.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  throw new HttpError(409, "Could not create a unique slug.");
}

export async function createEvent(actor: StaffUser, input: EventInput): Promise<{ id: string }> {
  if (!can(actor, "events.manage")) throw new HttpError(403, "You cannot manage events.");
  const title = text(input.title, 180);
  if (title.length < 3) throw new HttpError(400, "Enter an event title.");
  const startsAt = date(input.startsAt, "Start time", true) as Date;
  const endsAt = date(input.endsAt, "End time", false);
  if (endsAt && endsAt < startsAt) throw new HttpError(400, "The end time must be after the start time.");
  const slug = await resolveSlug(title, input.slug);

  const [row] = await db
    .insert(event)
    .values({
      slug,
      title,
      summary: text(input.summary, 600),
      descriptionHtml: sanitizeArticleHtml(text(input.descriptionHtml, 100_000)),
      startsAt,
      endsAt,
      venue: text(input.venue, 200) || null,
      organizer: text(input.organizer, 200) || null,
      registrationUrl: /^https?:\/\//i.test(String(input.registrationUrl ?? ""))
        ? String(input.registrationUrl).slice(0, 500)
        : null,
      isPublished: Boolean(input.isPublished),
      isFeatured: Boolean(input.isFeatured),
      createdBy: actor.id,
    })
    .returning({ id: event.id });
  if (!row) throw new HttpError(500, "Could not create the event.");
  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "event.created",
    entityType: "event",
    entityId: row.id,
    metadata: { title, slug },
  });
  return row;
}

export async function updateEvent(actor: StaffUser, id: string, input: EventInput): Promise<void> {
  if (!can(actor, "events.manage")) throw new HttpError(403, "You cannot manage events.");
  const [existing] = await db.select().from(event).where(eq(event.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Event not found.");
  const title = input.title === undefined ? existing.title : text(input.title, 180);
  if (title.length < 3) throw new HttpError(400, "Enter an event title.");
  const startsAt = input.startsAt === undefined ? existing.startsAt : (date(input.startsAt, "Start time", true) as Date);
  const endsAt = input.endsAt === undefined ? existing.endsAt : date(input.endsAt, "End time", false);
  if (endsAt && endsAt < startsAt) throw new HttpError(400, "The end time must be after the start time.");
  const slug =
    input.slug === undefined && input.title === undefined
      ? existing.slug
      : await resolveSlug(title, input.slug ?? existing.slug, id);

  await db
    .update(event)
    .set({
      slug,
      title,
      summary: input.summary === undefined ? existing.summary : text(input.summary, 600),
      descriptionHtml:
        input.descriptionHtml === undefined
          ? existing.descriptionHtml
          : sanitizeArticleHtml(text(input.descriptionHtml, 100_000)),
      startsAt,
      endsAt,
      venue: input.venue === undefined ? existing.venue : text(input.venue, 200) || null,
      organizer: input.organizer === undefined ? existing.organizer : text(input.organizer, 200) || null,
      registrationUrl:
        input.registrationUrl === undefined
          ? existing.registrationUrl
          : /^https?:\/\//i.test(String(input.registrationUrl))
            ? String(input.registrationUrl).slice(0, 500)
            : null,
      isPublished: input.isPublished === undefined ? existing.isPublished : Boolean(input.isPublished),
      isFeatured: input.isFeatured === undefined ? existing.isFeatured : Boolean(input.isFeatured),
      updatedAt: new Date(),
    })
    .where(eq(event.id, id));

  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "event.updated",
    entityType: "event",
    entityId: id,
    metadata: { title, slug },
  });
}

export async function deleteEvent(actor: StaffUser, id: string): Promise<void> {
  if (!can(actor, "events.manage")) throw new HttpError(403, "You cannot manage events.");
  const [existing] = await db.select({ id: event.id, title: event.title }).from(event).where(eq(event.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Event not found.");
  await db.delete(event).where(eq(event.id, id));
  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "event.deleted",
    entityType: "event",
    entityId: id,
    metadata: { title: existing.title },
  });
}
