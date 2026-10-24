import { and, eq, ne } from "drizzle-orm";
import { db } from "@/server/db/client";
import { announcement, auditLog, category, sitePage, tag } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { slugify } from "@/server/ids";
import { can } from "@/server/permissions";
import { sanitizeArticleHtml, sanitizePlainText } from "@/server/sanitize";
import type { StaffUser } from "@/server/session";

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, `${field} is not a valid date.`);
  return parsed;
}

async function uniqueSlug(
  table: typeof category | typeof tag,
  base: string,
  exceptId?: string,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: table.id })
      .from(table)
      .where(exceptId ? and(eq(table.slug, candidate), ne(table.id, exceptId)) : eq(table.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  throw new HttpError(409, "Could not create a unique slug.");
}

export async function updateSitePage(actor: StaffUser, id: string, input: Record<string, unknown>) {
  if (!can(actor, "institutional.manage")) throw new HttpError(403, "You cannot edit institutional pages.");
  const [existing] = await db.select().from(sitePage).where(eq(sitePage.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Page not found.");
  const title = input.title === undefined ? existing.title : str(input.title, 180);
  if (title.length < 2) throw new HttpError(400, "Enter a page title.");
  await db
    .update(sitePage)
    .set({
      title,
      bodyHtml:
        input.bodyHtml === undefined ? existing.bodyHtml : sanitizeArticleHtml(str(input.bodyHtml, 200_000)),
      section: input.section === undefined ? existing.section : str(input.section, 40) || "page",
      orderIndex:
        input.orderIndex === undefined ? existing.orderIndex : Number.isFinite(Number(input.orderIndex)) ? Number(input.orderIndex) : existing.orderIndex,
      isPublished: input.isPublished === undefined ? existing.isPublished : Boolean(input.isPublished),
      updatedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(sitePage.id, id));
  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "site_page.updated",
    entityType: "site_page",
    entityId: id,
    metadata: { title },
  });
}

export async function saveAnnouncement(actor: StaffUser, id: string | null, input: Record<string, unknown>) {
  if (!can(actor, "institutional.manage")) throw new HttpError(403, "You cannot manage announcements.");
  const message = str(input.message, 400);
  if (message.length < 4) throw new HttpError(400, "Write a short announcement message.");
  const level = ["info", "warning", "critical"].includes(String(input.level)) ? String(input.level) : "info";
  const values = {
    message,
    level,
    linkLabel: str(input.linkLabel, 60) || null,
    linkUrl: /^https?:\/\//i.test(String(input.linkUrl ?? "")) || String(input.linkUrl ?? "").startsWith("/")
      ? str(input.linkUrl, 500)
      : null,
    startsAt: optionalDate(input.startsAt, "Start time"),
    endsAt: optionalDate(input.endsAt, "End time"),
    isActive: bool(input.isActive, true),
  };

  if (id) {
    const [existing] = await db.select({ id: announcement.id }).from(announcement).where(eq(announcement.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Announcement not found.");
    await db.update(announcement).set(values).where(eq(announcement.id, id));
    await db.insert(auditLog).values({
      actorId: actor.id,
      action: "announcement.updated",
      entityType: "announcement",
      entityId: id,
      metadata: { message },
    });
    return { id };
  }
  const [row] = await db
    .insert(announcement)
    .values({ ...values, createdBy: actor.id })
    .returning({ id: announcement.id });
  if (!row) throw new HttpError(500, "Could not create the announcement.");
  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "announcement.created",
    entityType: "announcement",
    entityId: row.id,
    metadata: { message },
  });
  return row;
}

export async function deleteAnnouncement(actor: StaffUser, id: string) {
  if (!can(actor, "institutional.manage")) throw new HttpError(403, "You cannot manage announcements.");
  const [existing] = await db.select({ id: announcement.id, message: announcement.message }).from(announcement).where(eq(announcement.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Announcement not found.");
  await db.delete(announcement).where(eq(announcement.id, id));
  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "announcement.deleted",
    entityType: "announcement",
    entityId: id,
    metadata: { message: existing.message },
  });
}

export async function saveCategory(actor: StaffUser, id: string | null, input: Record<string, unknown>) {
  if (!can(actor, "taxonomy.manage")) throw new HttpError(403, "You cannot manage categories.");
  const name = str(input.name, 80);
  if (name.length < 2) throw new HttpError(400, "Enter a category name.");
  const base = slugify(str(input.slug, 80) || name);
  const slug = await uniqueSlug(category, base, id ?? undefined);
  const values = {
    name,
    slug,
    description: str(input.description, 300) || null,
    kind: str(input.kind, 40) || "news",
    orderIndex: Number.isFinite(Number(input.orderIndex)) ? Number(input.orderIndex) : 0,
    isActive: bool(input.isActive, true),
    updatedAt: new Date(),
  };
  if (id) {
    await db.update(category).set(values).where(eq(category.id, id));
    await db.insert(auditLog).values({ actorId: actor.id, action: "category.updated", entityType: "category", entityId: id, metadata: { name, slug } });
    return { id };
  }
  const [row] = await db.insert(category).values(values).returning({ id: category.id });
  if (!row) throw new HttpError(500, "Could not create the category.");
  await db.insert(auditLog).values({ actorId: actor.id, action: "category.created", entityType: "category", entityId: row.id, metadata: { name, slug } });
  return row;
}

export async function deleteCategory(actor: StaffUser, id: string) {
  if (!can(actor, "taxonomy.manage")) throw new HttpError(403, "You cannot manage categories.");
  const [used] = await db.select({ id: category.id }).from(category).where(eq(category.id, id)).limit(1);
  if (!used) throw new HttpError(404, "Category not found.");
  await db.delete(category).where(eq(category.id, id));
  await db.insert(auditLog).values({ actorId: actor.id, action: "category.deleted", entityType: "category", entityId: id });
}

export async function saveTag(actor: StaffUser, id: string | null, input: Record<string, unknown>) {
  if (!can(actor, "taxonomy.manage")) throw new HttpError(403, "You cannot manage tags.");
  const name = str(input.name, 60);
  if (name.length < 2) throw new HttpError(400, "Enter a tag name.");
  const slug = await uniqueSlug(tag, slugify(str(input.slug, 60) || name), id ?? undefined);
  if (id) {
    await db.update(tag).set({ name, slug }).where(eq(tag.id, id));
    await db.insert(auditLog).values({ actorId: actor.id, action: "tag.updated", entityType: "tag", entityId: id, metadata: { name, slug } });
    return { id };
  }
  const [row] = await db.insert(tag).values({ name, slug }).returning({ id: tag.id });
  if (!row) throw new HttpError(500, "Could not create the tag.");
  await db.insert(auditLog).values({ actorId: actor.id, action: "tag.created", entityType: "tag", entityId: row.id, metadata: { name, slug } });
  return row;
}

export async function deleteTag(actor: StaffUser, id: string) {
  if (!can(actor, "taxonomy.manage")) throw new HttpError(403, "You cannot manage tags.");
  const [existing] = await db.select({ id: tag.id }).from(tag).where(eq(tag.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Tag not found.");
  await db.delete(tag).where(eq(tag.id, id));
  await db.insert(auditLog).values({ actorId: actor.id, action: "tag.deleted", entityType: "tag", entityId: id });
}

export { sanitizePlainText };
