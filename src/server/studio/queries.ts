import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { academicPage, facultyProfile, teamMember } from "@/server/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import {
  adminApproval,
  article,
  articleRevision,
  articleRevisionAuthor,
  auditLog,
  articleTag,
  category,
  event,
  invitation,
  announcement,
  mediaAsset,
  publicComment,
  sitePage,
  tag,
  articleRevisionMedia,
  editorialReview,
  notification,
  user,
} from "@/server/db/schema";
import { can } from "@/server/permissions";
import type { StaffUser } from "@/server/session";
import type { WorkflowStatus } from "@/server/workflow/state";

const wr = alias(articleRevision, "wr");
const editorUser = alias(user, "editor_user");

export type StudioArticleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  contentType: string;
  updatedAt: Date;
  publishedAt: Date | null;
  scheduledFor: Date | null;
  categoryName: string | null;
  authorNames: string | null;
  revisionId: string | null;
  revisionNumber: number | null;
};

function ownScope(user: StaffUser): SQL {
  return sql`(
    ${article.createdBy} = ${user.id}
    OR EXISTS (
      SELECT 1 FROM article_revision_author ara
      JOIN article_revision ar ON ar.id = ara.revision_id
      WHERE ar.article_id = ${article.id} AND ara.user_id = ${user.id}
    )
  )`;
}

function scopeFor(user: StaffUser): SQL | undefined {
  return can(user, "article.editAny") ? undefined : ownScope(user);
}

const REVIEW_STATUSES = ["submitted", "resubmitted", "in_review"];

export async function listAllTeamMembers() {
  return db.select().from(teamMember).orderBy(asc(teamMember.group), asc(teamMember.orderIndex), asc(teamMember.name));
}

export async function getTeamMemberById(id: string) {
  const [member] = await db.select().from(teamMember).where(eq(teamMember.id, id)).limit(1);
  return member ?? null;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), sql`${notification.readAt} IS NULL`));
  return row?.total ?? 0;
}

export type StudioCounts = {
  myDrafts: number;
  review: number;
  approvals: number;
  pendingComments: number;
  scheduled: number;
  unread: number;
};

export async function getStudioCounts(user: StaffUser): Promise<StudioCounts> {
  const scope = scopeFor(user);
  const canSeeReview = can(user, "editorial.viewQueue");
  const canSeeApprovals = can(user, "admin.viewApprovalQueue");
  const canSeeComments = can(user, "comments.moderate");

  const [drafts] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(article)
    .where(
      and(
        inArray(article.workflowStatus, ["draft", "changes_requested"]),
        scope ?? sql`true`,
      ),
    );

  const [review] = canSeeReview
    ? await db
        .select({ total: sql<number>`count(*)::int` })
        .from(article)
        .where(inArray(article.workflowStatus, REVIEW_STATUSES))
    : [{ total: 0 }];

  const [approvals] = canSeeApprovals
    ? await db
        .select({ total: sql<number>`count(*)::int` })
        .from(article)
        .where(eq(article.workflowStatus, "editorially_approved"))
    : [{ total: 0 }];

  const [pendingComments] = canSeeComments
    ? await db
        .select({ total: sql<number>`count(*)::int` })
        .from(publicComment)
        .where(eq(publicComment.status, "pending"))
    : [{ total: 0 }];

  const [scheduled] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(article)
    .where(and(eq(article.workflowStatus, "scheduled"), scope ?? sql`true`));

  const unread = await getUnreadNotificationCount(user.id);

  return {
    myDrafts: drafts?.total ?? 0,
    review: review?.total ?? 0,
    approvals: approvals?.total ?? 0,
    pendingComments: pendingComments?.total ?? 0,
    scheduled: scheduled?.total ?? 0,
    unread,
  };
}

export type StudioArticleFilters = {
  q?: string;
  status?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
  scope?: "mine" | "all";
};

export async function listStudioArticles(
  user: StaffUser,
  filters: StudioArticleFilters = {},
): Promise<{ rows: StudioArticleRow[]; total: number; page: number; perPage: number }> {
  const perPage = Math.min(Math.max(filters.perPage ?? 20, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const conditions: (SQL | undefined)[] = [];

  const scoped = filters.scope === "all" && can(user, "article.editAny") ? undefined : scopeFor(user);
  if (scoped) conditions.push(scoped);

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(article.workflowStatus, filters.status));
  }
  if (filters.categoryId) conditions.push(eq(article.categoryId, filters.categoryId));
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      sql`(${wr.title} ILIKE ${term} OR ${wr.summary} ILIKE ${term} OR ${article.slug} ILIKE ${term})`,
    );
  }

  const where = and(...conditions.filter(Boolean));

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(article)
    .leftJoin(wr, eq(wr.id, article.workingRevisionId))
    .where(where);

  const rows = await db
    .select({
      id: article.id,
      slug: article.slug,
      title: wr.title,
      summary: wr.summary,
      status: article.workflowStatus,
      contentType: article.contentType,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt,
      scheduledFor: article.scheduledFor,
      categoryName: category.name,
      revisionId: article.workingRevisionId,
      revisionNumber: wr.revisionNumber,
      authorNames: sql<string | null>`(
        SELECT string_agg(u.name, ', ' ORDER BY ara.byline_order)
        FROM article_revision_author ara
        JOIN "user" u ON u.id = ara.user_id
        WHERE ara.revision_id = ${wr.id}
      )`,
    })
    .from(article)
    .leftJoin(wr, eq(wr.id, article.workingRevisionId))
    .leftJoin(category, eq(category.id, article.categoryId))
    .where(where)
    .orderBy(desc(article.updatedAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return {
    rows: rows.map((row) => ({
      ...row,
      title: row.title ?? "(untitled draft)",
    })),
    total: countRow?.total ?? 0,
    page,
    perPage,
  };
}

export async function listReviewQueue(limit = 50): Promise<StudioArticleRow[]> {
  const rows = await db
    .select({
      id: article.id,
      slug: article.slug,
      title: wr.title,
      summary: wr.summary,
      status: article.workflowStatus,
      contentType: article.contentType,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt,
      scheduledFor: article.scheduledFor,
      categoryName: category.name,
      revisionId: article.workingRevisionId,
      revisionNumber: wr.revisionNumber,
      authorNames: sql<string | null>`(
        SELECT string_agg(u.name, ', ' ORDER BY ara.byline_order)
        FROM article_revision_author ara
        JOIN "user" u ON u.id = ara.user_id
        WHERE ara.revision_id = ${wr.id}
      )`,
    })
    .from(article)
    .leftJoin(wr, eq(wr.id, article.workingRevisionId))
    .leftJoin(category, eq(category.id, article.categoryId))
    .where(inArray(article.workflowStatus, REVIEW_STATUSES))
    .orderBy(asc(article.updatedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, title: row.title ?? "(untitled draft)" }));
}

export async function listApprovalQueue(limit = 50): Promise<
  (StudioArticleRow & { editorName: string | null; editoriallyApprovedAt: Date | null })[]
> {
  const rows = await db
    .select({
      id: article.id,
      slug: article.slug,
      title: wr.title,
      summary: wr.summary,
      status: article.workflowStatus,
      contentType: article.contentType,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt,
      scheduledFor: article.scheduledFor,
      categoryName: category.name,
      revisionId: article.workingRevisionId,
      revisionNumber: wr.revisionNumber,
      authorNames: sql<string | null>`(
        SELECT string_agg(u.name, ', ' ORDER BY ara.byline_order)
        FROM article_revision_author ara
        JOIN "user" u ON u.id = ara.user_id
        WHERE ara.revision_id = ${wr.id}
      )`,
      editorName: editorUser.name,
      editoriallyApprovedAt: editorialReview.createdAt,
    })
    .from(article)
    .leftJoin(wr, eq(wr.id, article.workingRevisionId))
    .leftJoin(category, eq(category.id, article.categoryId))
    .leftJoin(
      editorialReview,
      and(
        eq(editorialReview.revisionId, article.workingRevisionId),
        eq(editorialReview.decision, "approved"),
        sql`${editorialReview.invalidatedAt} IS NULL`,
      ),
    )
    .leftJoin(editorUser, eq(editorUser.id, editorialReview.editorId))
    .where(eq(article.workflowStatus, "editorially_approved"))
    .orderBy(asc(article.updatedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, title: row.title ?? "(untitled draft)" }));
}

export async function listMyNotifications(userId: string, limit = 40) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), sql`${notification.readAt} IS NULL`));
}

export type DashboardFeedItem = Pick<
  StudioArticleRow,
  "id" | "slug" | "title" | "status" | "updatedAt" | "categoryName" | "authorNames"
>;

export async function getDashboardFeed(user: StaffUser, limit = 8): Promise<DashboardFeedItem[]> {
  return db
    .select({
      id: article.id,
      slug: article.slug,
      title: wr.title,
      status: article.workflowStatus,
      updatedAt: article.updatedAt,
      categoryName: category.name,
      authorNames: sql<string | null>`(
        SELECT string_agg(u.name, ', ' ORDER BY ara.byline_order)
        FROM article_revision_author ara
        JOIN "user" u ON u.id = ara.user_id
        WHERE ara.revision_id = ${wr.id}
      )`,
    })
    .from(article)
    .leftJoin(wr, eq(wr.id, article.workingRevisionId))
    .leftJoin(category, eq(category.id, article.categoryId))
    .where(scopeFor(user))
    .orderBy(desc(article.updatedAt))
    .limit(limit)
    .then((rows) => rows.map((row) => ({ ...row, title: row.title ?? "(untitled draft)" })));
}

export async function getStudioArticle(articleId: string) {
  const [row] = await db.select().from(article).where(eq(article.id, articleId)).limit(1);
  if (!row) return null;

  const revisionId = row.workingRevisionId;
  const [revision] = revisionId
    ? await db.select().from(articleRevision).where(eq(articleRevision.id, revisionId)).limit(1)
    : [];

  const authors = revision
    ? await db
        .select({
          userId: articleRevisionAuthor.userId,
          name: user.name,
          bylineName: articleRevisionAuthor.bylineName,
          bylineOrder: articleRevisionAuthor.bylineOrder,
          authorRole: articleRevisionAuthor.authorRole,
        })
        .from(articleRevisionAuthor)
        .innerJoin(user, eq(user.id, articleRevisionAuthor.userId))
        .where(eq(articleRevisionAuthor.revisionId, revision.id))
        .orderBy(asc(articleRevisionAuthor.bylineOrder))
    : [];

  const reviews = await db
    .select({
      id: editorialReview.id,
      decision: editorialReview.decision,
      note: editorialReview.note,
      checklist: editorialReview.checklist,
      createdAt: editorialReview.createdAt,
      invalidatedAt: editorialReview.invalidatedAt,
      editorName: editorUser.name,
      editorId: editorialReview.editorId,
    })
    .from(editorialReview)
    .leftJoin(editorUser, eq(editorUser.id, editorialReview.editorId))
    .where(eq(editorialReview.articleId, articleId))
    .orderBy(desc(editorialReview.createdAt));

  const approvals = await db
    .select({
      id: adminApproval.id,
      decision: adminApproval.decision,
      reason: adminApproval.reason,
      createdAt: adminApproval.createdAt,
      adminName: editorUser.name,
    })
    .from(adminApproval)
    .leftJoin(editorUser, eq(editorUser.id, adminApproval.adminId))
    .where(eq(adminApproval.articleId, articleId))
    .orderBy(desc(adminApproval.createdAt));

  const [cat] = row.categoryId
    ? await db
        .select({ id: category.id, name: category.name, slug: category.slug })
        .from(category)
        .where(eq(category.id, row.categoryId))
        .limit(1)
    : [];

  const tags = await db
    .select({ name: tag.name, slug: tag.slug })
    .from(articleTag)
    .innerJoin(tag, eq(tag.id, articleTag.tagId))
    .where(eq(articleTag.articleId, articleId))
    .orderBy(asc(tag.name));

  const mediaIds = await getArticleMediaIds(articleId);

  return {
    article: row,
    revision: revision ?? null,
    authors,
    reviews,
    approvals,
    category: cat ?? null,
    tags,
    mediaIds,
  };
}

export type StudioArticleDetail = NonNullable<Awaited<ReturnType<typeof getStudioArticle>>>;

export function canEditArticle(user: StaffUser, detail: StudioArticleDetail): boolean {
  if (can(user, "article.editAny")) return true;
  if (detail.article.createdBy === user.id) return true;
  return detail.authors.some((author) => author.userId === user.id);
}

export function statusGroup(status: string): "draft" | "review" | "approval" | "published" | "other" {
  if (["draft", "changes_requested", "rejected"].includes(status)) return "draft";
  if (["submitted", "resubmitted", "in_review"].includes(status)) return "review";
  if (["editorially_approved", "admin_approved", "scheduled"].includes(status)) return "approval";
  if (["published", "archived", "unpublished"].includes(status)) return "published";
  return "other";
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  changes_requested: "Changes requested",
  resubmitted: "Resubmitted",
  editorially_approved: "Editorially approved",
  admin_approved: "Admin approved",
  published: "Published",
  scheduled: "Scheduled",
  rejected: "Rejected",
  archived: "Archived",
  unpublished: "Unpublished",
};

export function workflowStatus(value: string): WorkflowStatus {
  return value as WorkflowStatus;
}

// ---------------------------------------------------------------------------
// Editor options and moderation/admin listings
// ---------------------------------------------------------------------------
export async function listCategoryOptions() {
  return db
    .select({ id: category.id, name: category.name, slug: category.slug })
    .from(category)
    .orderBy(asc(category.name));
}

export async function listAuthorOptions() {
  return db
    .select({
      id: user.id,
      name: user.name,
      role: user.role,
      title: user.title,
      slug: user.slug,
    })
    .from(user)
    .where(sql`${user.banned} IS NOT TRUE`)
    .orderBy(asc(user.name));
}

export async function listMediaAssets(user: StaffUser, limit = 120) {
  const where = can(user, "media.manageAll") ? undefined : eq(mediaAsset.uploadedBy, user.id);
  return db
    .select({
      id: mediaAsset.id,
      originalName: mediaAsset.originalName,
      alt: mediaAsset.alt,
      caption: mediaAsset.caption,
      credit: mediaAsset.credit,
      mimeType: mediaAsset.mimeType,
      sizeBytes: mediaAsset.sizeBytes,
      width: mediaAsset.width,
      height: mediaAsset.height,
      createdAt: mediaAsset.createdAt,
      isPrivate: mediaAsset.isPrivate,
      uploadedBy: mediaAsset.uploadedBy,
    })
    .from(mediaAsset)
    .where(where)
    .orderBy(desc(mediaAsset.createdAt))
    .limit(limit);
}

export async function listTagOptions(limit = 200) {
  return db.select({ id: tag.id, name: tag.name, slug: tag.slug }).from(tag).orderBy(asc(tag.name)).limit(limit);
}

export async function getArticleMediaIds(articleId: string): Promise<string[]> {
  const rows = await db
    .select({ mediaId: articleRevisionMedia.mediaId })
    .from(articleRevisionMedia)
    .innerJoin(articleRevision, eq(articleRevision.id, articleRevisionMedia.revisionId))
    .where(eq(articleRevision.articleId, articleId));
  return rows.map((row) => row.mediaId);
}

export async function listCommentsForModeration(params: {
  status?: string;
  q?: string;
  page?: number;
  perPage?: number;
}) {
  const perPage = Math.min(Math.max(params.perPage ?? 30, 1), 100);
  const page = Math.max(params.page ?? 1, 1);
  const conditions: (SQL | undefined)[] = [];
  if (params.status && params.status !== "all") conditions.push(eq(publicComment.status, params.status));
  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(sql`(${publicComment.authorName} ILIKE ${term} OR ${publicComment.body} ILIKE ${term})`);
  }
  const where = and(...conditions.filter(Boolean));

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(publicComment)
    .where(where);

  const rows = await db
    .select({
      id: publicComment.id,
      authorName: publicComment.authorName,
      authorEmail: publicComment.authorEmail,
      body: publicComment.body,
      status: publicComment.status,
      reportCount: publicComment.reportCount,
      createdAt: publicComment.createdAt,
      moderatedAt: publicComment.moderatedAt,
      moderationNote: publicComment.moderationNote,
      articleId: publicComment.articleId,
      articleSlug: article.slug,
      articleTitle: articleRevision.title,
    })
    .from(publicComment)
    .leftJoin(article, eq(article.id, publicComment.articleId))
    .leftJoin(articleRevision, eq(articleRevision.id, article.publishedRevisionId))
    .where(where)
    .orderBy(desc(publicComment.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return { rows, total: countRow?.total ?? 0, page, perPage };
}

export async function listStaffUsers(q?: string, limit = 100) {
  const where = q?.trim() ? sql`(${user.name} ILIKE ${`%${q.trim()}%`} OR ${user.email} ILIKE ${`%${q.trim()}%`})` : undefined;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      slug: user.slug,
      banned: user.banned,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(where)
    .orderBy(asc(user.name))
    .limit(limit);
}

export async function listAuditEntries(params: { limit?: number; entityType?: string; q?: string } = {}) {
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 300);
  const entityType = params.entityType && params.entityType !== "all" ? eq(auditLog.entityType, params.entityType) : undefined;
  const q = params.q?.trim() ? sql`${auditLog.action} ILIKE ${"%" + params.q.trim() + "%"}` : undefined;
  const where = entityType && q ? and(entityType, q) : (entityType ?? q);
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      fromStatus: auditLog.fromStatus,
      toStatus: auditLog.toStatus,
      reason: auditLog.reason,
      createdAt: auditLog.createdAt,
      actorName: user.name,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function listAllEvents() {
  return db.select().from(event).orderBy(desc(event.startsAt));
}

export async function listAllAnnouncements() {
  return db.select().from(announcement).orderBy(desc(announcement.createdAt));
}

export async function listAllSitePages() {
  return db.select().from(sitePage).orderBy(asc(sitePage.section), asc(sitePage.orderIndex));
}

export async function listPendingInvitations() {
  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      invitedByName: user.name,
    })
    .from(invitation)
    .leftJoin(user, eq(user.id, invitation.invitedBy))
    .where(and(isNull(invitation.acceptedAt), isNull(invitation.revokedAt)))
    .orderBy(desc(invitation.createdAt));
}

export async function getEventById(id: string) {
  const [row] = await db.select().from(event).where(eq(event.id, id)).limit(1);
  return row ?? null;
}

export async function getSitePageById(id: string) {
  const [row] = await db.select().from(sitePage).where(eq(sitePage.id, id)).limit(1);
  return row ?? null;
}

export async function listAllCategories() {
  return db.select().from(category).orderBy(asc(category.orderIndex), asc(category.name));
}

export async function listAllTags() {
  return db.select().from(tag).orderBy(asc(tag.name));
}

export async function listAllFaculty() {
  return db.select().from(facultyProfile).orderBy(asc(facultyProfile.orderIndex), asc(facultyProfile.name));
}

export async function getFacultyById(id: string) {
  const [row] = await db.select().from(facultyProfile).where(eq(facultyProfile.id, id)).limit(1);
  return row ?? null;
}

export async function listAllAcademicPages() {
  return db.select().from(academicPage).orderBy(asc(academicPage.orderIndex), asc(academicPage.title));
}

export async function getAcademicPageById(id: string) {
  const [row] = await db.select().from(academicPage).where(eq(academicPage.id, id)).limit(1);
  return row ?? null;
}
