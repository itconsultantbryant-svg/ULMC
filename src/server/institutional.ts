import { and, eq, ne } from "drizzle-orm";
import { db } from "@/server/db/client";
import { academicPage, auditLog, facultyProfile } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { slugify } from "@/server/ids";
import { can } from "@/server/permissions";
import { sanitizeArticleHtml } from "@/server/sanitize";
import type { StaffUser } from "@/server/session";

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function uniqueSlugFor(table: typeof facultyProfile | typeof academicPage, base: string, exceptId?: string) {
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

export async function saveFaculty(actor: StaffUser, id: string | null, input: Record<string, unknown>) {
  if (!can(actor, "faculty.manage")) throw new HttpError(403, "You cannot manage faculty profiles.");
  const name = str(input.name, 160);
  if (name.length < 2) throw new HttpError(400, "Enter a name.");
  const role = str(input.role, 160);
  if (role.length < 2) throw new HttpError(400, "Enter a role or title.");
  const base = slugify(str(input.slug, 160) || name);
  const slug = await uniqueSlugFor(facultyProfile, base, id ?? undefined);
  const values = {
    slug,
    name,
    role,
    photoId: str(input.photoId, 36) || null,
    bio: str(input.bio, 4000),
    qualifications: str(input.qualifications, 1000) || null,
    teachingInterests: str(input.teachingInterests, 1000) || null,
    researchInterests: str(input.researchInterests, 1000) || null,
    email: str(input.email, 200) || null,
    phone: str(input.phone, 60) || null,
    office: str(input.office, 120) || null,
    orderIndex: Number.isFinite(Number(input.orderIndex)) ? Number(input.orderIndex) : 0,
    isActive: bool(input.isActive, true),
    updatedAt: new Date(),
  };
  if (id) {
    const [existing] = await db.select({ id: facultyProfile.id }).from(facultyProfile).where(eq(facultyProfile.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Profile not found.");
    await db.update(facultyProfile).set(values).where(eq(facultyProfile.id, id));
    await db.insert(auditLog).values({ actorId: actor.id, action: "faculty.updated", entityType: "faculty_profile", entityId: id, metadata: { name } });
    return { id };
  }
  const [row] = await db.insert(facultyProfile).values(values).returning({ id: facultyProfile.id });
  if (!row) throw new HttpError(500, "Could not create the profile.");
  await db.insert(auditLog).values({ actorId: actor.id, action: "faculty.created", entityType: "faculty_profile", entityId: row.id, metadata: { name } });
  return row;
}

export async function deleteFaculty(actor: StaffUser, id: string) {
  if (!can(actor, "faculty.manage")) throw new HttpError(403, "You cannot manage faculty profiles.");
  const [existing] = await db.select({ id: facultyProfile.id, name: facultyProfile.name }).from(facultyProfile).where(eq(facultyProfile.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Profile not found.");
  await db.delete(facultyProfile).where(eq(facultyProfile.id, id));
  await db.insert(auditLog).values({ actorId: actor.id, action: "faculty.deleted", entityType: "faculty_profile", entityId: id, metadata: { name: existing.name } });
}

export async function saveAcademicPage(actor: StaffUser, id: string | null, input: Record<string, unknown>) {
  if (!can(actor, "academics.manage")) throw new HttpError(403, "You cannot manage academic pages.");
  const title = str(input.title, 180);
  if (title.length < 2) throw new HttpError(400, "Enter a title.");
  const base = slugify(str(input.slug, 180) || title);
  const slug = await uniqueSlugFor(academicPage, base, id ?? undefined);
  const values = {
    slug,
    title,
    kind: str(input.kind, 40) || "program",
    summary: str(input.summary, 600),
    bodyHtml: sanitizeArticleHtml(str(input.bodyHtml, 200_000)),
    linkUrl: /^https?:\/\//i.test(String(input.linkUrl ?? "")) ? str(input.linkUrl, 500) : null,
    documentId: str(input.documentId, 36) || null,
    orderIndex: Number.isFinite(Number(input.orderIndex)) ? Number(input.orderIndex) : 0,
    isPublished: bool(input.isPublished, false),
    updatedBy: actor.id,
    updatedAt: new Date(),
  };
  if (id) {
    const [existing] = await db.select({ id: academicPage.id }).from(academicPage).where(eq(academicPage.id, id)).limit(1);
    if (!existing) throw new HttpError(404, "Page not found.");
    await db.update(academicPage).set(values).where(eq(academicPage.id, id));
    await db.insert(auditLog).values({ actorId: actor.id, action: "academic_page.updated", entityType: "academic_page", entityId: id, metadata: { title } });
    return { id };
  }
  const [row] = await db.insert(academicPage).values(values).returning({ id: academicPage.id });
  if (!row) throw new HttpError(500, "Could not create the page.");
  await db.insert(auditLog).values({ actorId: actor.id, action: "academic_page.created", entityType: "academic_page", entityId: row.id, metadata: { title } });
  return row;
}

export async function deleteAcademicPage(actor: StaffUser, id: string) {
  if (!can(actor, "academics.manage")) throw new HttpError(403, "You cannot manage academic pages.");
  const [existing] = await db.select({ id: academicPage.id, title: academicPage.title }).from(academicPage).where(eq(academicPage.id, id)).limit(1);
  if (!existing) throw new HttpError(404, "Page not found.");
  await db.delete(academicPage).where(eq(academicPage.id, id));
  await db.insert(auditLog).values({ actorId: actor.id, action: "academic_page.deleted", entityType: "academic_page", entityId: id, metadata: { title: existing.title } });
}
