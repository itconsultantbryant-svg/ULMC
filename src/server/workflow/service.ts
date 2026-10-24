import { createHash } from "node:crypto";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  adminApproval,
  article,
  articlePublication,
  articleRevision,
  articleRevisionAuthor,
  articleRevisionMedia,
  articleTag,
  category,
  editorialAssignment,
  editorialComment,
  editorialReview,
  mediaAsset,
  publicationSchedule,
  redirect,
  tag,
  user,
  workflowTransition,
} from "@/server/db/schema";
import type { Executor, Tx } from "@/server/db/executor";
import { recordAudit } from "@/server/audit";
import { notifyUsers } from "@/server/notifications";
import { enqueueJob } from "@/server/jobs";
import { enqueueOutbox, notifyNow, PUBLIC_EVENTS_CHANNEL } from "@/server/outbox";
import { invalidatePublicContent } from "@/server/cache";
import {
  can,
  canEditoriallyApprove,
  canFinallyApprove,
  parseRoles,
  type Permission,
  type Role,
} from "@/server/permissions";
import {
  countWords,
  extractMediaIds,
  readingMinutes,
  sanitizeArticleHtml,
  stripHtml,
} from "@/server/sanitize";
import { slugify } from "@/server/ids";
import { checklistComplete } from "./state";
import type { WorkflowStatus } from "./state";
import { WorkflowError } from "./errors";
import { articleInputSchema, editorialChecklistSchema, type ArticleInput } from "./validation";

export type Actor = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
};

async function loadActor(executor: Executor, actorId: string): Promise<Actor> {
  const rows = await executor
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new WorkflowError("unauthorized", "Account not found.");
  if (row.banned) throw new WorkflowError("forbidden", "This account is suspended.");
  return { id: row.id, name: row.name, email: row.email, roles: parseRoles(row.role) };
}

async function requireActor(
  executor: Executor,
  actorId: string,
  permission?: Permission,
): Promise<Actor> {
  const actor = await loadActor(executor, actorId);
  if (permission && !can(actor, permission)) {
    throw new WorkflowError("forbidden", "You do not have permission to perform this action.");
  }
  return actor;
}

function hashContent(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

async function uniqueSlug(
  executor: Executor,
  base: string,
  excludeArticleId?: string,
): Promise<string> {
  const root = slugify(base) || "article";
  let candidate = root;
  for (let i = 2; i < 200; i += 1) {
    const rows = await executor
      .select({ id: article.id })
      .from(article)
      .where(
        excludeArticleId
          ? and(eq(article.slug, candidate), ne(article.id, excludeArticleId))
          : eq(article.slug, candidate),
      )
      .limit(1);
    if (rows.length === 0) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

async function getArticleForUpdate(tx: Tx, articleId: string) {
  const rows = await tx.select().from(article).where(eq(article.id, articleId)).limit(1).for("update");
  const row = rows[0];
  if (!row) throw new WorkflowError("not_found", "Article not found.");
  return row;
}

async function getRevision(tx: Executor, revisionId: string) {
  const rows = await tx.select().from(articleRevision).where(eq(articleRevision.id, revisionId)).limit(1);
  const row = rows[0];
  if (!row) throw new WorkflowError("not_found", "Revision not found.");
  return row;
}

export async function getRevisionAuthorIds(
  executor: Executor,
  revisionId: string,
): Promise<string[]> {
  const rows = await executor
    .select({ userId: articleRevisionAuthor.userId })
    .from(articleRevisionAuthor)
    .where(eq(articleRevisionAuthor.revisionId, revisionId))
    .orderBy(articleRevisionAuthor.bylineOrder);
  return rows.map((r) => r.userId);
}

async function verifyRevisionComplete(executor: Executor, revision: typeof articleRevision.$inferSelect) {
  const plain = stripHtml(revision.bodyHtml);
  if (revision.title.trim().length < 3) {
    throw new WorkflowError("validation", "Add a headline before submitting.");
  }
  if (revision.summary.trim().length < 10) {
    throw new WorkflowError("validation", "Add a summary before submitting.");
  }
  if (plain.length < 20) {
    throw new WorkflowError("validation", "The article body is too short to submit.");
  }
  const authors = await getRevisionAuthorIds(executor, revision.id);
  if (authors.length === 0) {
    throw new WorkflowError("validation", "Add at least one author before submitting.");
  }
  const rows = await executor
    .select({ categoryId: article.categoryId })
    .from(article)
    .where(eq(article.id, revision.articleId))
    .limit(1);
  if (!rows[0]?.categoryId) {
    throw new WorkflowError("validation", "Choose a category before submitting.");
  }
  const media = await executor
    .select({ mediaId: articleRevisionMedia.mediaId })
    .from(articleRevisionMedia)
    .where(eq(articleRevisionMedia.revisionId, revision.id));
  if (media.length > 0) {
    const found = await executor
      .select({ id: mediaAsset.id })
      .from(mediaAsset)
      .where(inArray(mediaAsset.id, media.map((m) => m.mediaId)));
    if (found.length !== media.length) {
      throw new WorkflowError("validation", "One or more attached media files are missing.");
    }
  }
  if (revision.heroMediaId) {
    if (!revision.heroAlt?.trim()) {
      throw new WorkflowError("validation", "Add alt text for the featured image.");
    }
    if (!revision.heroCredit?.trim()) {
      throw new WorkflowError("validation", "Add a credit for the featured image.");
    }
  }
}

type Prepared = {
  input: ArticleInput;
  bodyHtml: string;
  heroAlt: string;
  heroCaption: string;
  heroCredit: string;
  authorIds: string[];
  mediaIds: string[];
  slug: string;
  wordCount: number;
  readingMinutes: number;
  hash: string;
};

async function prepareArticleInput(
  executor: Executor,
  actor: Actor,
  raw: unknown,
  options: { articleId?: string; currentSlug?: string } = {},
): Promise<Prepared> {
  const parsed = articleInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new WorkflowError("validation", "Please correct the highlighted fields.", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  const input = parsed.data;
  const bodyHtml = sanitizeArticleHtml(input.bodyHtml);
  if (stripHtml(bodyHtml).length < 20) {
    throw new WorkflowError("validation", "The article body is too short.");
  }

  const categoryRows = await executor
    .select({ id: category.id })
    .from(category)
    .where(and(eq(category.id, input.categoryId), eq(category.isActive, true)))
    .limit(1);
  if (!categoryRows[0]) throw new WorkflowError("validation", "Choose a valid category.");

  let authorIds = [...new Set(input.authorIds ?? [])];
  if (authorIds.length === 0) authorIds = [actor.id];
  const authorRows = await executor
    .select({ id: user.id, banned: user.banned })
    .from(user)
    .where(inArray(user.id, authorIds));
  if (authorRows.length !== authorIds.length || authorRows.some((r) => r.banned)) {
    throw new WorkflowError("validation", "One or more selected authors are unavailable.");
  }
  if (!authorIds.includes(actor.id) && !can(actor, "article.editAny")) {
    throw new WorkflowError("forbidden", "You can only publish under your own byline.");
  }

  let heroAlt = input.heroAlt ?? "";
  let heroCaption = input.heroCaption ?? "";
  let heroCredit = input.heroCredit ?? "";
  if (input.heroMediaId) {
    const mediaRows = await executor
      .select()
      .from(mediaAsset)
      .where(eq(mediaAsset.id, input.heroMediaId))
      .limit(1);
    const asset = mediaRows[0];
    if (!asset) throw new WorkflowError("validation", "The selected featured image was not found.");
    if (asset.uploadedBy !== actor.id && !can(actor, "media.manageAll")) {
      throw new WorkflowError("forbidden", "You cannot use another contributor's private media.");
    }
    heroAlt = heroAlt || asset.alt || "";
    heroCaption = heroCaption || asset.caption || "";
    heroCredit = heroCredit || asset.credit || "";
    if (!heroAlt.trim()) throw new WorkflowError("validation", "Add alt text for the featured image.");
    if (!heroCredit.trim()) throw new WorkflowError("validation", "Add a credit for the featured image.");
  }

  let slug = options.currentSlug ?? "";
  if (input.slug) {
    const taken = await executor
      .select({ id: article.id })
      .from(article)
      .where(
        options.articleId
          ? and(eq(article.slug, input.slug), ne(article.id, options.articleId))
          : eq(article.slug, input.slug),
      )
      .limit(1);
    if (taken[0]) throw new WorkflowError("validation", "That URL slug is already in use.");
    slug = input.slug;
  } else if (!slug) {
    slug = await uniqueSlug(executor, input.title, options.articleId);
  }

  const mediaIds = extractMediaIds(bodyHtml, input.heroMediaId ?? null);
  const wordCount = countWords(bodyHtml);
  const hash = hashContent({
    title: input.title,
    subtitle: input.subtitle,
    summary: input.summary,
    bodyHtml,
    heroMediaId: input.heroMediaId ?? null,
    heroAlt,
    heroCaption,
    heroCredit,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    canonicalUrl: input.canonicalUrl ?? "",
    authors: authorIds,
    tags: input.tagNames ?? [],
    slug,
  });

  return {
    input,
    bodyHtml,
    heroAlt,
    heroCaption,
    heroCredit,
    authorIds,
    mediaIds,
    slug,
    wordCount,
    readingMinutes: readingMinutes(wordCount),
    hash,
  };
}

async function replaceRevisionRelations(
  tx: Tx,
  revisionId: string,
  prepared: Prepared,
  articleId: string,
) {
  await tx.delete(articleRevisionAuthor).where(eq(articleRevisionAuthor.revisionId, revisionId));
  await tx.insert(articleRevisionAuthor).values(
    prepared.authorIds.map((userId, index) => ({
      revisionId,
      userId,
      bylineOrder: index,
      authorRole: "author",
    })),
  );

  await tx.delete(articleRevisionMedia).where(eq(articleRevisionMedia.revisionId, revisionId));
  if (prepared.mediaIds.length > 0) {
    await tx
      .insert(articleRevisionMedia)
      .values(prepared.mediaIds.map((mediaId) => ({ revisionId, mediaId })))
      .onConflictDoNothing();
  }

  if (prepared.input.tagNames && prepared.input.tagNames.length > 0) {
    const tagIds: string[] = [];
    for (const name of prepared.input.tagNames) {
      const slug = slugify(name);
      if (!slug) continue;
      const rows = await tx
        .insert(tag)
        .values({ slug, name })
        .onConflictDoUpdate({ target: tag.slug, set: { name } })
        .returning({ id: tag.id });
      if (rows[0]) tagIds.push(rows[0].id);
    }
    await tx.delete(articleTag).where(eq(articleTag.articleId, articleId));
    if (tagIds.length > 0) {
      await tx
        .insert(articleTag)
        .values([...new Set(tagIds)].map((tagId) => ({ articleId, tagId })))
        .onConflictDoNothing();
    }
  }
}

async function notifyEditors(
  tx: Tx,
  opts: { exclude?: string[]; type: string; title: string; body: string; link: string; dedupeKey: string },
) {
  const rows = await tx
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.banned, false));
  const ids = rows
    .filter(
      (r) =>
        parseRoles(r.role).some((role) => role === "editor" || role === "admin" || role === "super_admin") &&
        !(opts.exclude ?? []).includes(r.id),
    )
    .map((r) => r.id);
  await notifyUsers(tx, { ...opts, userIds: ids });
}

async function notifyAdmins(
  tx: Tx,
  opts: { exclude?: string[]; type: string; title: string; body: string; link: string; dedupeKey: string },
) {
  const rows = await tx
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.banned, false));
  const ids = rows
    .filter(
      (r) =>
        parseRoles(r.role).some((role) => role === "admin" || role === "super_admin") &&
        !(opts.exclude ?? []).includes(r.id),
    )
    .map((r) => r.id);
  await notifyUsers(tx, { ...opts, userIds: ids });
}

async function logTransition(
  tx: Tx,
  opts: {
    actorId: string | null;
    articleId: string;
    revisionId: string | null;
    from: string;
    to: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    action: string;
    ipHash?: string | null;
  },
) {
  await tx.insert(workflowTransition).values({
    articleId: opts.articleId,
    revisionId: opts.revisionId,
    actorId: opts.actorId,
    fromStatus: opts.from,
    toStatus: opts.to,
    reason: opts.reason ?? null,
    metadata: opts.metadata ?? {},
  });
  await recordAudit(tx, {
    actorId: opts.actorId,
    action: opts.action,
    entityType: "article",
    entityId: opts.articleId,
    articleId: opts.articleId,
    revisionId: opts.revisionId,
    fromStatus: opts.from,
    toStatus: opts.to,
    reason: opts.reason ?? null,
    metadata: opts.metadata ?? {},
    ipHash: opts.ipHash ?? null,
  });
}

// ---------------------------------------------------------------------------
// Create and edit
// ---------------------------------------------------------------------------
export async function createArticle(
  actorId: string,
  raw: unknown,
): Promise<{ articleId: string; revisionId: string; slug: string }> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "article.create");
    const prepared = await prepareArticleInput(tx, actor, raw);

    const [newArticle] = await tx
      .insert(article)
      .values({
        slug: prepared.slug,
        categoryId: prepared.input.categoryId,
        contentType: prepared.input.contentType,
        workflowStatus: "draft",
        allowComments: prepared.input.allowComments,
        createdBy: actor.id,
      })
      .returning({ id: article.id, slug: article.slug });
    if (!newArticle) throw new WorkflowError("conflict", "Could not create the article.");

    const [revision] = await tx
      .insert(articleRevision)
      .values({
        articleId: newArticle.id,
        revisionNumber: 1,
        version: 1,
        title: prepared.input.title,
        subtitle: prepared.input.subtitle || null,
        summary: prepared.input.summary,
        bodyHtml: prepared.bodyHtml,
        bodyJson: prepared.input.bodyJson ?? null,
        seoTitle: prepared.input.seoTitle || null,
        seoDescription: prepared.input.seoDescription || null,
        canonicalUrl: prepared.input.canonicalUrl || null,
        slugOverride: prepared.input.slug || null,
        heroMediaId: prepared.input.heroMediaId ?? null,
        heroCaption: prepared.heroCaption || null,
        heroCredit: prepared.heroCredit || null,
        heroAlt: prepared.heroAlt || null,
        contentHash: prepared.hash,
        wordCount: prepared.wordCount,
        readingMinutes: prepared.readingMinutes,
        createdBy: actor.id,
      })
      .returning({ id: articleRevision.id });
    if (!revision) throw new WorkflowError("conflict", "Could not create the article revision.");

    await replaceRevisionRelations(tx, revision.id, prepared, newArticle.id);
    await tx
      .update(article)
      .set({ workingRevisionId: revision.id, updatedAt: new Date() })
      .where(eq(article.id, newArticle.id));

    await recordAudit(tx, {
      actorId: actor.id,
      action: "article.created",
      entityType: "article",
      entityId: newArticle.id,
      articleId: newArticle.id,
      revisionId: revision.id,
      toStatus: "draft",
      metadata: { contentType: prepared.input.contentType },
    });

    return { articleId: newArticle.id, revisionId: revision.id, slug: newArticle.slug };
  });
}

export async function updateDraft(
  actorId: string,
  params: {
    articleId: string;
    revisionId: string;
    expectedVersion: number;
    input: unknown;
    ipHash?: string | null;
  },
): Promise<{ version: number; hash: string; updatedAt: string }> {
  return db.transaction(async (tx) => {
    const actor = await loadActor(tx, actorId);
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (!["draft", "changes_requested"].includes(articleRow.workflowStatus)) {
      throw new WorkflowError(
        "invalid_transition",
        "This story is locked. Create a replacement draft to make further changes.",
      );
    }
    if (articleRow.workingRevisionId !== params.revisionId) {
      throw new WorkflowError("conflict", "A newer revision of this story is active. Reload to continue.");
    }
    const revision = await getRevision(tx, params.revisionId);
    if (revision.lockedAt) {
      throw new WorkflowError("locked", "This revision is locked. Create a replacement draft to edit.");
    }
    const authors = await getRevisionAuthorIds(tx, revision.id);
    if (!authors.includes(actor.id) && !can(actor, "article.editAny")) {
      throw new WorkflowError("forbidden", "You can only edit your own stories.");
    }
    if (revision.version !== params.expectedVersion) {
      throw new WorkflowError("conflict", "Someone else saved changes to this story. Reload to merge.", {
        currentVersion: revision.version,
        updatedAt: revision.createdAt.toISOString(),
      });
    }

    const prepared = await prepareArticleInput(tx, actor, params.input, {
      articleId: articleRow.id,
      currentSlug: articleRow.slug,
    });

    const nextVersion = revision.version + 1;
    await tx
      .update(articleRevision)
      .set({
        title: prepared.input.title,
        subtitle: prepared.input.subtitle || null,
        summary: prepared.input.summary,
        bodyHtml: prepared.bodyHtml,
        bodyJson: prepared.input.bodyJson ?? revision.bodyJson,
        seoTitle: prepared.input.seoTitle || null,
        seoDescription: prepared.input.seoDescription || null,
        canonicalUrl: prepared.input.canonicalUrl || null,
        slugOverride: prepared.input.slug || revision.slugOverride,
        heroMediaId: prepared.input.heroMediaId ?? null,
        heroCaption: prepared.heroCaption || null,
        heroCredit: prepared.heroCredit || null,
        heroAlt: prepared.heroAlt || null,
        contentHash: prepared.hash,
        wordCount: prepared.wordCount,
        readingMinutes: prepared.readingMinutes,
        version: nextVersion,
      })
      .where(eq(articleRevision.id, revision.id));

    await replaceRevisionRelations(tx, revision.id, prepared, articleRow.id);

    const slug = articleRow.publishedRevisionId ? articleRow.slug : prepared.slug;
    await tx
      .update(article)
      .set({
        slug,
        categoryId: prepared.input.categoryId,
        contentType: prepared.input.contentType,
        allowComments: prepared.input.allowComments,
        workingRevisionId: revision.id,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(article.id, articleRow.id));

    await recordAudit(tx, {
      actorId: actor.id,
      action: "article.updated",
      entityType: "article_revision",
      entityId: revision.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      metadata: { version: nextVersion, wordCount: prepared.wordCount },
      ipHash: params.ipHash ?? null,
    });

    return { version: nextVersion, hash: prepared.hash, updatedAt: new Date().toISOString() };
  });
}

async function cloneRevision(
  tx: Tx,
  articleRow: typeof article.$inferSelect,
  sourceRevisionId: string,
  actor: Actor,
): Promise<typeof articleRevision.$inferSelect> {
  const source = await getRevision(tx, sourceRevisionId);
  const maxRows = await tx
    .select({ max: sql<number>`coalesce(max(${articleRevision.revisionNumber}), 0)` })
    .from(articleRevision)
    .where(eq(articleRevision.articleId, articleRow.id));
  const nextNumber = Number(maxRows[0]?.max ?? 0) + 1;

  const [created] = await tx
    .insert(articleRevision)
    .values({
      articleId: articleRow.id,
      revisionNumber: nextNumber,
      version: 1,
      title: source.title,
      subtitle: source.subtitle,
      summary: source.summary,
      bodyHtml: source.bodyHtml,
      bodyJson: source.bodyJson,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      canonicalUrl: source.canonicalUrl,
      slugOverride: source.slugOverride,
      heroMediaId: source.heroMediaId,
      heroCaption: source.heroCaption,
      heroCredit: source.heroCredit,
      heroAlt: source.heroAlt,
      contentHash: source.contentHash,
      wordCount: source.wordCount,
      readingMinutes: source.readingMinutes,
      createdBy: actor.id,
    })
    .returning();
  if (!created) throw new WorkflowError("conflict", "Could not create a new revision.");

  const authors = await tx
    .select()
    .from(articleRevisionAuthor)
    .where(eq(articleRevisionAuthor.revisionId, source.id));
  if (authors.length > 0) {
    await tx.insert(articleRevisionAuthor).values(
      authors.map((a) => ({
        revisionId: created.id,
        userId: a.userId,
        bylineName: a.bylineName,
        bylineOrder: a.bylineOrder,
        authorRole: a.authorRole,
      })),
    );
  }
  const media = await tx
    .select()
    .from(articleRevisionMedia)
    .where(eq(articleRevisionMedia.revisionId, source.id));
  if (media.length > 0) {
    await tx
      .insert(articleRevisionMedia)
      .values(media.map((m) => ({ revisionId: created.id, mediaId: m.mediaId })))
      .onConflictDoNothing();
  }
  return created;
}

/**
 * Begin a replacement draft for a story that is already approved, scheduled or
 * published. The live revision stays untouched and visible.
 */
export async function startReplacementDraft(
  actorId: string,
  articleId: string,
  ipHash?: string | null,
): Promise<{ revisionId: string; articleId: string }> {
  return db.transaction(async (tx) => {
    const actor = await loadActor(tx, actorId);
    const articleRow = await getArticleForUpdate(tx, articleId);
    const working = articleRow.workingRevisionId ? await getRevision(tx, articleRow.workingRevisionId) : null;
    const authors = working ? await getRevisionAuthorIds(tx, working.id) : [];
    if (!authors.includes(actor.id) && !can(actor, "article.editAny")) {
      throw new WorkflowError("forbidden", "You can only edit your own stories.");
    }

    if (["draft", "changes_requested", "submitted", "in_review", "resubmitted"].includes(articleRow.workflowStatus)) {
      if (!working) throw new WorkflowError("conflict", "This story has no editable revision.");
      return { revisionId: working.id, articleId };
    }

    const sourceId =
      articleRow.workflowStatus === "unpublished"
        ? (await latestPublicationRevision(tx, articleId)) ?? articleRow.workingRevisionId
        : articleRow.workingRevisionId ?? articleRow.publishedRevisionId;
    if (!sourceId) throw new WorkflowError("conflict", "There is no revision to base an edit on.");

    const created = await cloneRevision(tx, articleRow, sourceId, actor);

    await tx
      .update(publicationSchedule)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(and(eq(publicationSchedule.articleId, articleId), eq(publicationSchedule.status, "pending")));

    await tx
      .update(article)
      .set({
        workingRevisionId: created.id,
        workflowStatus: "draft",
        scheduledFor: null,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(article.id, articleId));

    await logTransition(tx, {
      actorId: actor.id,
      articleId,
      revisionId: created.id,
      from: articleRow.workflowStatus,
      to: "draft",
      reason: "Replacement draft created; previous approvals do not apply to this revision.",
      action: "article.replacement_started",
      ipHash,
    });

    return { revisionId: created.id, articleId };
  });
}

async function latestPublicationRevision(tx: Executor, articleId: string): Promise<string | null> {
  const rows = await tx
    .select({ revisionId: articlePublication.revisionId })
    .from(articlePublication)
    .where(eq(articlePublication.articleId, articleId))
    .orderBy(desc(articlePublication.publishedAt))
    .limit(1);
  return rows[0]?.revisionId ?? null;
}

// ---------------------------------------------------------------------------
// Writer submission and revision
// ---------------------------------------------------------------------------
export async function submitForReview(
  actorId: string,
  params: {
    articleId: string;
    revisionId: string;
    expectedVersion: number;
    ipHash?: string | null;
  },
): Promise<{ status: WorkflowStatus }> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "article.submitOwn");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    const revision = await getRevision(tx, params.revisionId);
    if (articleRow.workingRevisionId !== revision.id) {
      throw new WorkflowError("conflict", "A newer revision of this story is active. Reload to continue.");
    }

    if (["submitted", "resubmitted", "in_review"].includes(articleRow.workflowStatus)) {
      if (articleRow.workingRevisionId === revision.id) return { status: "submitted" };
      throw new WorkflowError("conflict", "This article has already been submitted.");
    }
    if (!["draft", "changes_requested"].includes(articleRow.workflowStatus)) {
      throw new WorkflowError("invalid_transition", "This article cannot be submitted from its current state.");
    }
    const authors = await getRevisionAuthorIds(tx, revision.id);
    if (!authors.includes(actor.id) && !can(actor, "article.editAny")) {
      throw new WorkflowError("forbidden", "You can only submit your own stories.");
    }
    if (revision.version !== params.expectedVersion) {
      throw new WorkflowError("conflict", "Someone else saved changes to this story. Reload to submit the latest version.", {
        currentVersion: revision.version,
      });
    }
    await verifyRevisionComplete(tx, revision);

    const to: WorkflowStatus = articleRow.workflowStatus === "changes_requested" ? "resubmitted" : "submitted";
    const now = new Date();
    await tx
      .update(articleRevision)
      .set({ lockedAt: now, version: revision.version + 1 })
      .where(eq(articleRevision.id, revision.id));
    await tx
      .update(article)
      .set({
        workflowStatus: to,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: now,
      })
      .where(eq(article.id, articleRow.id));

    const link = `/studio/articles/${articleRow.id}`;
    if (articleRow.assignedEditorId) {
      await notifyUsers(tx, {
        userIds: [articleRow.assignedEditorId],
        type: to === "resubmitted" ? "article.resubmitted" : "article.submitted",
        title: to === "resubmitted" ? "Revised story resubmitted" : "New story submitted for review",
        body: revision.title,
        link,
        dedupeKey: `${to}:${revision.id}`,
      });
    } else {
      await notifyEditors(tx, {
        type: to === "resubmitted" ? "article.resubmitted" : "article.submitted",
        title: to === "resubmitted" ? "Revised story resubmitted" : "New story submitted for review",
        body: `${actor.name}: ${revision.title}`,
        link,
        dedupeKey: `${to}:${revision.id}`,
      });
    }

    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      from: articleRow.workflowStatus,
      to,
      action: to === "resubmitted" ? "article.resubmitted" : "article.submitted",
      metadata: { revisionNumber: revision.revisionNumber, contentHash: revision.contentHash },
      ipHash: params.ipHash,
    });

    return { status: to };
  });
}

export async function resubmit(
  actorId: string,
  params: { articleId: string; revisionId: string; expectedVersion: number; ipHash?: string | null },
): Promise<{ status: WorkflowStatus }> {
  return submitForReview(actorId, params);
}

// ---------------------------------------------------------------------------
// Editorial review
// ---------------------------------------------------------------------------
export async function startEditorialReview(
  actorId: string,
  params: { articleId: string; revisionId: string; ipHash?: string | null },
): Promise<{ status: WorkflowStatus }> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.viewQueue");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (!["submitted", "resubmitted"].includes(articleRow.workflowStatus)) {
      if (articleRow.workflowStatus === "in_review") return { status: "in_review" };
      throw new WorkflowError("invalid_transition", "This story is not waiting for editorial review.");
    }
    if (articleRow.workingRevisionId !== params.revisionId) {
      throw new WorkflowError("conflict", "This is not the active revision. Reload to continue.");
    }
    if (
      articleRow.assignedEditorId &&
      articleRow.assignedEditorId !== actor.id &&
      !can(actor, "admin.viewApprovalQueue")
    ) {
      throw new WorkflowError("forbidden", "This story is assigned to another editor.");
    }
    const revision = await getRevision(tx, params.revisionId);
    if (!revision.lockedAt) {
      throw new WorkflowError("locked", "The writer has not submitted this revision.");
    }

    const now = new Date();
    await tx
      .update(article)
      .set({
        workflowStatus: "in_review",
        assignedEditorId: articleRow.assignedEditorId ?? actor.id,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: now,
      })
      .where(eq(article.id, articleRow.id));

    if (!articleRow.assignedEditorId) {
      await tx
        .insert(editorialAssignment)
        .values({
          articleId: articleRow.id,
          revisionId: revision.id,
          editorId: actor.id,
          assignedBy: actor.id,
          status: "active",
        })
        .onConflictDoNothing();
    }

    const authors = await getRevisionAuthorIds(tx, revision.id);
    await notifyUsers(tx, {
      userIds: authors,
      type: "article.in_review",
      title: "Your story is in editorial review",
      body: `${actor.name} started reviewing “${revision.title}”.`,
      link: `/studio/articles/${articleRow.id}`,
      dedupeKey: `review-start:${revision.id}`,
    });

    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      from: articleRow.workflowStatus,
      to: "in_review",
      action: "article.review_started",
      ipHash: params.ipHash,
    });
    return { status: "in_review" };
  });
}

export async function addEditorialComment(
  actorId: string,
  params: {
    articleId: string;
    revisionId: string;
    body: string;
    parentId?: string | null;
    anchorText?: string;
    anchorPath?: string;
    ipHash?: string | null;
  },
): Promise<{ commentId: string }> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.comment");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    const revision = await getRevision(tx, params.revisionId);
    if (revision.articleId !== articleRow.id) throw new WorkflowError("not_found", "Revision not found.");
    const body = stripHtml(params.body).slice(0, 4000);
    if (body.length < 2) throw new WorkflowError("validation", "Write a comment before posting.");

    let rootId: string | null = null;
    if (params.parentId) {
      const parents = await tx
        .select()
        .from(editorialComment)
        .where(eq(editorialComment.id, params.parentId))
        .limit(1);
      const parent = parents[0];
      if (!parent || parent.revisionId !== revision.id) {
        throw new WorkflowError("validation", "The comment thread could not be found.");
      }
      rootId = parent.rootId ?? parent.id;
    }

    const [created] = await tx
      .insert(editorialComment)
      .values({
        articleId: articleRow.id,
        revisionId: revision.id,
        parentId: params.parentId ?? null,
        rootId,
        authorId: actor.id,
        body,
        anchorText: params.anchorText?.slice(0, 300) ?? null,
        anchorPath: params.anchorPath?.slice(0, 300) ?? null,
      })
      .returning({ id: editorialComment.id });
    if (!created) throw new WorkflowError("conflict", "Could not post the comment.");

    const authors = await getRevisionAuthorIds(tx, revision.id);
    const isAuthor = authors.includes(actor.id);
    if (isAuthor && articleRow.assignedEditorId) {
      await notifyUsers(tx, {
        userIds: [articleRow.assignedEditorId],
        type: "editorial.comment",
        title: "New reply on your story",
        body: body.slice(0, 140),
        link: `/studio/articles/${articleRow.id}#comment-${created.id}`,
      });
    } else if (!isAuthor) {
      await notifyUsers(tx, {
        userIds: authors,
        type: "editorial.comment",
        title: "Editor left a note on your story",
        body: body.slice(0, 140),
        link: `/studio/articles/${articleRow.id}#comment-${created.id}`,
      });
    }

    await recordAudit(tx, {
      actorId: actor.id,
      action: "editorial_comment.created",
      entityType: "editorial_comment",
      entityId: created.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      ipHash: params.ipHash ?? null,
    });
    return { commentId: created.id };
  });
}

export async function setEditorialCommentResolved(
  actorId: string,
  params: { commentId: string; resolved: boolean },
): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.comment");
    const rows = await tx
      .select()
      .from(editorialComment)
      .where(eq(editorialComment.id, params.commentId))
      .limit(1);
    const comment = rows[0];
    if (!comment) throw new WorkflowError("not_found", "Comment not found.");
    await tx
      .update(editorialComment)
      .set({
        isResolved: params.resolved,
        resolvedBy: params.resolved ? actor.id : null,
        resolvedAt: params.resolved ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(editorialComment.id, comment.id));
    await recordAudit(tx, {
      actorId: actor.id,
      action: params.resolved ? "editorial_comment.resolved" : "editorial_comment.reopened",
      entityType: "editorial_comment",
      entityId: comment.id,
      articleId: comment.articleId,
      revisionId: comment.revisionId,
    });
  });
}

export async function requestChanges(
  actorId: string,
  params: {
    articleId: string;
    revisionId: string;
    reason: string;
    checklist?: Record<string, boolean>;
    ipHash?: string | null;
  },
): Promise<{ revisionId: string }> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.requestChanges");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (articleRow.workflowStatus !== "in_review") {
      throw new WorkflowError("invalid_transition", "Changes can only be requested during editorial review.");
    }
    if (articleRow.workingRevisionId !== params.revisionId) {
      throw new WorkflowError("conflict", "This is not the active revision.");
    }
    if (
      articleRow.assignedEditorId &&
      articleRow.assignedEditorId !== actor.id &&
      !can(actor, "admin.viewApprovalQueue")
    ) {
      throw new WorkflowError("forbidden", "This story is assigned to another editor.");
    }
    const reason = params.reason.trim();
    if (reason.length < 10) {
      throw new WorkflowError("validation", "Explain the required changes (at least 10 characters).");
    }
    const revision = await getRevision(tx, params.revisionId);

    await tx
      .update(editorialReview)
      .set({ invalidatedAt: new Date() })
      .where(
        and(
          eq(editorialReview.revisionId, revision.id),
          isNull(editorialReview.invalidatedAt),
        ),
      );
    const [review] = await tx
      .insert(editorialReview)
      .values({
        articleId: articleRow.id,
        revisionId: revision.id,
        editorId: actor.id,
        decision: "changes_requested",
        checklist: params.checklist ?? {},
        note: reason,
      })
      .returning({ id: editorialReview.id });

    const created = await cloneRevision(tx, articleRow, revision.id, actor);
    const now = new Date();
    await tx
      .update(article)
      .set({
        workflowStatus: "changes_requested",
        workingRevisionId: created.id,
        assignedEditorId: articleRow.assignedEditorId ?? actor.id,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: now,
      })
      .where(eq(article.id, articleRow.id));

    const authors = await getRevisionAuthorIds(tx, revision.id);
    await notifyUsers(tx, {
      userIds: authors,
      type: "article.changes_requested",
      title: "Changes requested on your story",
      body: reason.slice(0, 180),
      link: `/studio/articles/${articleRow.id}`,
      dedupeKey: `changes:${review?.id}`,
    });

    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      from: articleRow.workflowStatus,
      to: "changes_requested",
      reason,
      action: "article.changes_requested",
      metadata: { newRevisionId: created.id, reviewId: review?.id },
      ipHash: params.ipHash,
    });
    return { revisionId: created.id };
  });
}

export async function editorialApprove(
  actorId: string,
  params: {
    articleId: string;
    revisionId: string;
    checklist: unknown;
    note?: string;
    ipHash?: string | null;
  },
): Promise<{ status: WorkflowStatus; reviewId: string }> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.approve");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (articleRow.workflowStatus !== "in_review") {
      throw new WorkflowError("invalid_transition", "This story is not in editorial review.");
    }
    if (articleRow.workingRevisionId !== params.revisionId) {
      throw new WorkflowError("conflict", "This is not the active revision.");
    }
    if (
      articleRow.assignedEditorId &&
      articleRow.assignedEditorId !== actor.id &&
      !can(actor, "admin.viewApprovalQueue")
    ) {
      throw new WorkflowError("forbidden", "This story is assigned to another editor.");
    }
    const revision = await getRevision(tx, params.revisionId);
    if (!revision.lockedAt) throw new WorkflowError("locked", "This revision is not locked.");
    const authors = await getRevisionAuthorIds(tx, revision.id);
    if (!canEditoriallyApprove({ actorId: actor.id, authorIds: authors })) {
      throw new WorkflowError(
        "separation_of_duties",
        "You cannot editorially approve a story you wrote. Another editor must review it.",
      );
    }
    const parsedChecklist = editorialChecklistSchema.safeParse(params.checklist);
    if (!parsedChecklist.success || !checklistComplete(params.checklist)) {
      throw new WorkflowError("validation", "Complete every required editorial checklist item.", {
        checklist: parsedChecklist.success ? parsedChecklist.data : null,
      });
    }

    await tx
      .update(editorialReview)
      .set({ invalidatedAt: new Date() })
      .where(and(eq(editorialReview.revisionId, revision.id), isNull(editorialReview.invalidatedAt)));
    await tx
      .update(adminApproval)
      .set({ invalidatedAt: new Date() })
      .where(and(eq(adminApproval.revisionId, revision.id), isNull(adminApproval.invalidatedAt)));

    const [review] = await tx
      .insert(editorialReview)
      .values({
        articleId: articleRow.id,
        revisionId: revision.id,
        editorId: actor.id,
        decision: "approved",
        checklist: parsedChecklist.data,
        note: params.note?.slice(0, 2000) ?? null,
      })
      .returning({ id: editorialReview.id });
    if (!review) throw new WorkflowError("conflict", "Could not record editorial approval.");

    const now = new Date();
    await tx
      .update(article)
      .set({
        workflowStatus: "editorially_approved",
        assignedEditorId: articleRow.assignedEditorId ?? actor.id,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: now,
      })
      .where(eq(article.id, articleRow.id));

    await notifyAdmins(tx, {
      exclude: [actor.id],
      type: "article.pending_admin",
      title: "Story ready for final approval",
      body: `${actor.name} editorially approved “${revision.title}”.`,
      link: `/studio/approvals/${articleRow.id}`,
      dedupeKey: `editorial-approved:${review.id}`,
    });

    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      from: articleRow.workflowStatus,
      to: "editorially_approved",
      action: "article.editorially_approved",
      metadata: { reviewId: review.id, revisionNumber: revision.revisionNumber },
      ipHash: params.ipHash,
    });
    return { status: "editorially_approved", reviewId: review.id };
  });
}

// ---------------------------------------------------------------------------
// Accessibility helpers used by the dashboard
// ---------------------------------------------------------------------------
export async function getValidEditorialReview(
  executor: Executor,
  revisionId: string,
): Promise<typeof editorialReview.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(editorialReview)
    .where(
      and(
        eq(editorialReview.revisionId, revisionId),
        eq(editorialReview.decision, "approved"),
        isNull(editorialReview.invalidatedAt),
      ),
    )
    .orderBy(desc(editorialReview.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getValidAdminApproval(
  executor: Executor,
  revisionId: string,
): Promise<typeof adminApproval.$inferSelect | null> {
  const rows = await executor
    .select()
    .from(adminApproval)
    .where(
      and(
        eq(adminApproval.revisionId, revisionId),
        eq(adminApproval.decision, "approved"),
        isNull(adminApproval.invalidatedAt),
      ),
    )
    .orderBy(desc(adminApproval.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

async function assertPublishable(
  tx: Executor,
  revision: typeof articleRevision.$inferSelect,
): Promise<{ review: typeof editorialReview.$inferSelect; approval: typeof adminApproval.$inferSelect }> {
  if (!revision.lockedAt) {
    throw new WorkflowError("missing_approval", "This revision was never submitted and locked.");
  }
  const review = await getValidEditorialReview(tx, revision.id);
  if (!review) {
    throw new WorkflowError("missing_approval", "This exact revision has no valid editorial approval.");
  }
  const approval = await getValidAdminApproval(tx, revision.id);
  if (!approval) {
    throw new WorkflowError("missing_approval", "This exact revision has no administrative approval.");
  }
  if (approval.editorialReviewId !== review.id) {
    throw new WorkflowError("approval_stale", "The administrative approval no longer matches the editorial review.");
  }
  const authors = await getRevisionAuthorIds(tx, revision.id);
  if (authors.includes(approval.adminId)) {
    throw new WorkflowError("separation_of_duties", "The approving administrator is an author of this story.");
  }
  if (approval.adminId === review.editorId) {
    throw new WorkflowError("separation_of_duties", "The approving administrator performed the editorial approval.");
  }
  return { review, approval };
}

// ---------------------------------------------------------------------------
// Final administrative decision
// ---------------------------------------------------------------------------
export async function adminDecision(
  actorId: string,
  params: {
    articleId: string;
    revisionId: string;
    decision: "approve" | "return" | "reject";
    reason?: string;
    ipHash?: string | null;
  },
): Promise<{ status: WorkflowStatus; approvalId: string }> {
  return db.transaction(async (tx) => {
    const permission: Permission =
      params.decision === "approve" ? "admin.approve" : params.decision === "return" ? "admin.return" : "admin.reject";
    const actor = await requireActor(tx, actorId, permission);
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (articleRow.workflowStatus !== "editorially_approved") {
      if (articleRow.workflowStatus === "admin_approved" && params.decision === "approve") {
        const existing = await getValidAdminApproval(tx, params.revisionId);
        if (existing) return { status: "admin_approved", approvalId: existing.id };
      }
      throw new WorkflowError("invalid_transition", "This story is not awaiting administrative approval.");
    }
    if (articleRow.workingRevisionId !== params.revisionId) {
      throw new WorkflowError("approval_stale", "This is not the revision that was editorially approved.");
    }
    const revision = await getRevision(tx, params.revisionId);
    const review = await getValidEditorialReview(tx, revision.id);
    if (!review) {
      throw new WorkflowError("missing_approval", "Editorial approval is missing or was invalidated.");
    }
    const authors = await getRevisionAuthorIds(tx, revision.id);
    const reason = params.reason?.trim() ?? "";

    if (params.decision !== "approve") {
      if (reason.length < 10) {
        throw new WorkflowError("validation", "Provide a reason of at least 10 characters.");
      }
      const nextStatus: WorkflowStatus = params.decision === "return" ? "in_review" : "rejected";
      if (params.decision === "return") {
        await tx
          .update(editorialReview)
          .set({ invalidatedAt: new Date() })
          .where(eq(editorialReview.id, review.id));
      }
      const [approval] = await tx
        .insert(adminApproval)
        .values({
          articleId: articleRow.id,
          revisionId: revision.id,
          adminId: actor.id,
          editorialReviewId: review.id,
          decision: params.decision === "return" ? "returned" : "rejected",
          reason,
        })
        .returning({ id: adminApproval.id });
      if (!approval) throw new WorkflowError("conflict", "Could not record the decision.");

      await tx
        .update(article)
        .set({
          workflowStatus: nextStatus,
          assignedEditorId: review.editorId,
          lockVersion: articleRow.lockVersion + 1,
          updatedAt: new Date(),
        })
        .where(eq(article.id, articleRow.id));

      await notifyUsers(tx, {
        userIds: [review.editorId, ...authors],
        type: `article.${params.decision === "return" ? "returned" : "rejected"}_by_admin`,
        title: params.decision === "return" ? "Story returned to editor" : "Story rejected at final review",
        body: reason.slice(0, 180),
        link: `/studio/articles/${articleRow.id}`,
        dedupeKey: `admin-${params.decision}:${approval.id}`,
      });

      await logTransition(tx, {
        actorId: actor.id,
        articleId: articleRow.id,
        revisionId: revision.id,
        from: articleRow.workflowStatus,
        to: nextStatus,
        reason,
        action: params.decision === "return" ? "article.returned_to_editor" : "article.rejected_by_admin",
        metadata: { approvalId: approval.id, reviewId: review.id },
        ipHash: params.ipHash,
      });
      return { status: nextStatus, approvalId: approval.id };
    }

    if (!canFinallyApprove({ actorId: actor.id, authorIds: authors, editorId: review.editorId })) {
      throw new WorkflowError(
        "separation_of_duties",
        "Final approval requires an administrator who is not the author or the reviewing editor.",
      );
    }

    await tx
      .update(adminApproval)
      .set({ invalidatedAt: new Date() })
      .where(and(eq(adminApproval.revisionId, revision.id), isNull(adminApproval.invalidatedAt)));

    const [approval] = await tx
      .insert(adminApproval)
      .values({
        articleId: articleRow.id,
        revisionId: revision.id,
        adminId: actor.id,
        editorialReviewId: review.id,
        decision: "approved",
        reason: reason || null,
      })
      .returning({ id: adminApproval.id });
    if (!approval) throw new WorkflowError("conflict", "Could not record administrative approval.");

    await tx
      .update(article)
      .set({
        workflowStatus: "admin_approved",
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(article.id, articleRow.id));

    await notifyUsers(tx, {
      userIds: [review.editorId, ...authors],
      type: "article.admin_approved",
      title: "Story approved for publication",
      body: `${actor.name} gave final approval to “${revision.title}”.`,
      link: `/studio/articles/${articleRow.id}`,
      dedupeKey: `admin-approved:${approval.id}`,
    });

    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      from: articleRow.workflowStatus,
      to: "admin_approved",
      reason: reason || null,
      action: "article.admin_approved",
      metadata: { approvalId: approval.id, reviewId: review.id, revisionNumber: revision.revisionNumber },
      ipHash: params.ipHash,
    });

    return { status: "admin_approved", approvalId: approval.id };
  });
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------
type PublishResult = {
  status: "published";
  publicationId: string;
  slug: string;
  revisionId: string;
  already: boolean;
};

async function performPublish(
  tx: Tx,
  opts: {
    articleRow: typeof article.$inferSelect;
    revision: typeof articleRevision.$inferSelect;
    actorId: string | null;
    scheduleId?: string | null;
    action: string;
    ipHash?: string | null;
  },
): Promise<PublishResult> {
  if (opts.articleRow.publishedRevisionId === opts.revision.id) {
    const existing = await tx
      .select({ id: articlePublication.id })
      .from(articlePublication)
      .where(
        and(
          eq(articlePublication.articleId, opts.articleRow.id),
          eq(articlePublication.revisionId, opts.revision.id),
          eq(articlePublication.isCurrent, true),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return {
        status: "published",
        publicationId: existing[0].id,
        slug: opts.articleRow.slug,
        revisionId: opts.revision.id,
        already: true,
      };
    }
  }

  await assertPublishable(tx, opts.revision);

  const authors = await getRevisionAuthorIds(tx, opts.revision.id);
  let slug = opts.articleRow.slug;
  const proposed = opts.revision.slugOverride?.trim();
  if (proposed && proposed !== slug) {
    const conflict = await tx
      .select({ id: article.id })
      .from(article)
      .where(and(eq(article.slug, proposed), ne(article.id, opts.articleRow.id)))
      .limit(1);
    if (conflict[0]) {
      throw new WorkflowError("validation", "The proposed URL slug is already in use.");
    }
    await tx
      .insert(redirect)
      .values({ fromPath: `/news/${slug}`, toPath: `/news/${proposed}` })
      .onConflictDoUpdate({
        target: redirect.fromPath,
        set: { toPath: `/news/${proposed}` },
      });
    slug = proposed;
  }

  const now = new Date();
  await tx
    .update(articlePublication)
    .set({ isCurrent: false })
    .where(
      and(eq(articlePublication.articleId, opts.articleRow.id), eq(articlePublication.isCurrent, true)),
    );

  const [publication] = await tx
    .insert(articlePublication)
    .values({
      articleId: opts.articleRow.id,
      revisionId: opts.revision.id,
      scheduleId: opts.scheduleId ?? null,
      publishedBy: opts.actorId,
      publishedAt: now,
      isCurrent: true,
    })
    .returning({ id: articlePublication.id });
  if (!publication) throw new WorkflowError("conflict", "Could not record the publication.");

  await tx
    .update(article)
    .set({
      slug,
      publishedRevisionId: opts.revision.id,
      publishedAt: now,
      workflowStatus: "published",
      scheduledFor: null,
      unpublishedAt: null,
      unpublishReason: null,
      archivedAt: null,
      lockVersion: opts.articleRow.lockVersion + 1,
      updatedAt: now,
    })
    .where(eq(article.id, opts.articleRow.id));

  await tx
    .update(publicationSchedule)
    .set({ status: "cancelled", cancelledAt: now })
    .where(
      and(
        eq(publicationSchedule.articleId, opts.articleRow.id),
        eq(publicationSchedule.status, "pending"),
      ),
    );

  const categoryRows = await tx
    .select({ slug: category.slug })
    .from(category)
    .where(eq(category.id, opts.articleRow.categoryId ?? ""))
    .limit(1);

  const eventId = `pub_${publication.id}`;
  await enqueueOutbox(tx, {
    eventType: "article.published",
    idempotencyKey: `outbox:publish:${publication.id}`,
    payload: {
      eventId,
      articleId: opts.articleRow.id,
      revisionId: opts.revision.id,
      publicationId: publication.id,
      slug,
      title: opts.revision.title,
      summary: opts.revision.summary,
      categorySlug: categoryRows[0]?.slug ?? null,
      contentType: opts.articleRow.contentType,
      publishedAt: now.toISOString(),
      authorIds: authors,
    },
  });

  await logTransition(tx, {
    actorId: opts.actorId,
    articleId: opts.articleRow.id,
    revisionId: opts.revision.id,
    from: opts.articleRow.workflowStatus,
    to: "published",
    action: opts.action,
    metadata: {
      publicationId: publication.id,
      revisionNumber: opts.revision.revisionNumber,
      slug,
      scheduled: Boolean(opts.scheduleId),
    },
    ipHash: opts.ipHash,
  });

  return {
    status: "published",
    publicationId: publication.id,
    slug,
    revisionId: opts.revision.id,
    already: false,
  };
}

export async function publishNow(
  actorId: string,
  params: { articleId: string; revisionId: string; ipHash?: string | null },
): Promise<PublishResult> {
  const result = await db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "article.publish");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (!["admin_approved", "unpublished"].includes(articleRow.workflowStatus)) {
      throw new WorkflowError(
        "invalid_transition",
        "Only an administratively approved revision can be published.",
      );
    }
    if (articleRow.workingRevisionId !== params.revisionId) {
      throw new WorkflowError("approval_stale", "This is not the revision awaiting publication.");
    }
    const revision = await getRevision(tx, params.revisionId);
    const published = await performPublish(tx, {
      articleRow,
      revision,
      actorId: actor.id,
      action: "article.published",
      ipHash: params.ipHash,
    });
    return published;
  });

  await invalidatePublicContent([`/news/${result.slug}`, `/authors`]);
  if (!result.already) {
    await notifyNow(PUBLIC_EVENTS_CHANNEL, {
      eventId: `pub_${result.publicationId}`,
      type: "article.published",
      articleId: params.articleId,
      revisionId: result.revisionId,
      slug: result.slug,
      at: new Date().toISOString(),
    });
  }
  return result;
}

export async function schedulePublication(
  actorId: string,
  params: { articleId: string; revisionId: string; scheduledFor: Date; ipHash?: string | null },
): Promise<{ scheduleId: string; scheduledFor: string; already: boolean }> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "article.schedule");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (!["admin_approved", "scheduled"].includes(articleRow.workflowStatus)) {
      throw new WorkflowError("invalid_transition", "Only an approved revision can be scheduled.");
    }
    if (articleRow.workingRevisionId !== params.revisionId) {
      throw new WorkflowError("approval_stale", "This is not the approved revision.");
    }
    const when = params.scheduledFor;
    if (!(when instanceof Date) || Number.isNaN(when.getTime())) {
      throw new WorkflowError("validation", "Choose a valid date and time.");
    }
    if (when.getTime() < Date.now() + 30_000) {
      throw new WorkflowError("validation", "Scheduled time must be at least 30 seconds in the future.");
    }
    const revision = await getRevision(tx, params.revisionId);
    await assertPublishable(tx, revision);

    const idempotencyKey = `schedule:${params.articleId}:${params.revisionId}:${when.toISOString()}`;
    const existing = await tx
      .select()
      .from(publicationSchedule)
      .where(eq(publicationSchedule.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing[0]) {
      return {
        scheduleId: existing[0].id,
        scheduledFor: existing[0].scheduledFor.toISOString(),
        already: true,
      };
    }

    await tx
      .update(publicationSchedule)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(
        and(
          eq(publicationSchedule.articleId, params.articleId),
          eq(publicationSchedule.status, "pending"),
        ),
      );

    const [schedule] = await tx
      .insert(publicationSchedule)
      .values({
        articleId: params.articleId,
        revisionId: params.revisionId,
        scheduledFor: when,
        idempotencyKey,
        createdBy: actor.id,
      })
      .returning();
    if (!schedule) throw new WorkflowError("conflict", "Could not schedule this story.");

    await tx
      .update(article)
      .set({
        workflowStatus: "scheduled",
        scheduledFor: when,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(article.id, params.articleId));

    await enqueueJob(tx, {
      type: "publish_scheduled",
      payload: { scheduleId: schedule.id },
      runAt: when,
      idempotencyKey: `job:publish_scheduled:${schedule.id}`,
    });

    const authors = await getRevisionAuthorIds(tx, revision.id);
    await notifyUsers(tx, {
      userIds: authors,
      type: "article.scheduled",
      title: "Story scheduled for publication",
      body: `“${revision.title}” is scheduled for ${when.toISOString()}.`,
      link: `/studio/articles/${params.articleId}`,
      dedupeKey: `scheduled:${schedule.id}`,
    });

    await logTransition(tx, {
      actorId: actor.id,
      articleId: params.articleId,
      revisionId: params.revisionId,
      from: articleRow.workflowStatus,
      to: "scheduled",
      action: "article.scheduled",
      metadata: { scheduleId: schedule.id, scheduledFor: when.toISOString() },
      ipHash: params.ipHash,
    });

    return { scheduleId: schedule.id, scheduledFor: when.toISOString(), already: false };
  });
}

export async function cancelSchedule(
  actorId: string,
  params: { articleId: string; reason?: string; ipHash?: string | null },
): Promise<void> {
  return db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "article.schedule");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (articleRow.workflowStatus !== "scheduled") {
      throw new WorkflowError("invalid_transition", "This story is not scheduled.");
    }
    await tx
      .update(publicationSchedule)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(
        and(
          eq(publicationSchedule.articleId, params.articleId),
          eq(publicationSchedule.status, "pending"),
        ),
      );
    await tx
      .update(article)
      .set({
        workflowStatus: "admin_approved",
        scheduledFor: null,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(article.id, params.articleId));

    await logTransition(tx, {
      actorId: actor.id,
      articleId: params.articleId,
      revisionId: articleRow.workingRevisionId,
      from: "scheduled",
      to: "admin_approved",
      reason: params.reason ?? "Schedule cancelled",
      action: "article.schedule_cancelled",
      ipHash: params.ipHash,
    });
  });
}

/**
 * Durable scheduled publishing. Idempotent: safe to call repeatedly for the
 * same schedule; publishing happens exactly once.
 */
export async function processScheduledPublication(
  scheduleId: string,
): Promise<{ status: string; slug?: string; already?: boolean }> {
  const outcome = await db.transaction(async (tx) => {
    const scheduleRows = await tx
      .select()
      .from(publicationSchedule)
      .where(eq(publicationSchedule.id, scheduleId))
      .limit(1)
      .for("update");
    const schedule = scheduleRows[0];
    if (!schedule) return { status: "missing" as const };
    if (schedule.status === "published") return { status: "already_published" as const, slug: undefined };
    if (schedule.status !== "pending") return { status: schedule.status };

    const articleRow = await getArticleForUpdate(tx, schedule.articleId);
    if (articleRow.workflowStatus !== "scheduled") {
      await tx
        .update(publicationSchedule)
        .set({ status: "cancelled", cancelledAt: new Date(), lastError: "Article is no longer scheduled." })
        .where(eq(publicationSchedule.id, schedule.id));
      return { status: "cancelled" as const };
    }
    if (articleRow.workingRevisionId !== schedule.revisionId) {
      await tx
        .update(publicationSchedule)
        .set({ status: "failed", lastError: "Approved revision is no longer the working revision." })
        .where(eq(publicationSchedule.id, schedule.id));
      return { status: "failed" as const };
    }
    const revision = await getRevision(tx, schedule.revisionId);
    try {
      await assertPublishable(tx, revision);
    } catch (error) {
      await tx
        .update(publicationSchedule)
        .set({ status: "failed", lastError: (error as Error).message })
        .where(eq(publicationSchedule.id, schedule.id));
      return { status: "failed" as const, reason: (error as Error).message };
    }
    if (schedule.scheduledFor.getTime() > Date.now() + 1000) {
      await enqueueJob(tx, {
        type: "publish_scheduled",
        payload: { scheduleId: schedule.id },
        runAt: schedule.scheduledFor,
        idempotencyKey: `job:publish_scheduled:${schedule.id}`,
      });
      return { status: "deferred" as const };
    }
    const published = await performPublish(tx, {
      articleRow,
      revision,
      actorId: schedule.createdBy,
      scheduleId: schedule.id,
      action: "article.published_scheduled",
    });
    if (!published.already) {
      await tx
        .update(publicationSchedule)
        .set({ status: "published", processedAt: new Date() })
        .where(eq(publicationSchedule.id, schedule.id));
    }
    return { status: "published" as const, slug: published.slug, already: published.already };
  });

  if (outcome.status === "published") {
    await invalidatePublicContent(outcome.slug ? [`/news/${outcome.slug}`] : []);
    if (!outcome.already) {
      await notifyNow(PUBLIC_EVENTS_CHANNEL, {
        type: "article.published",
        slug: outcome.slug,
        at: new Date().toISOString(),
      });
    }
  }
  return outcome;
}

export async function unpublish(
  actorId: string,
  params: { articleId: string; reason: string; ipHash?: string | null },
): Promise<{ slug: string }> {
  const result = await db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "article.unpublish");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (articleRow.workflowStatus !== "published" || !articleRow.publishedRevisionId) {
      throw new WorkflowError("invalid_transition", "Only a published story can be unpublished.");
    }
    const reason = params.reason.trim();
    if (reason.length < 10) {
      throw new WorkflowError("validation", "A recorded reason of at least 10 characters is required.");
    }
    const slug = articleRow.slug;
    const revisionId = articleRow.publishedRevisionId;
    const now = new Date();
    await tx
      .update(articlePublication)
      .set({
        isCurrent: false,
        unpublishedAt: now,
        unpublishedBy: actor.id,
        unpublishReason: reason,
      })
      .where(
        and(eq(articlePublication.articleId, articleRow.id), eq(articlePublication.isCurrent, true)),
      );
    await tx
      .update(publicationSchedule)
      .set({ status: "cancelled", cancelledAt: now })
      .where(
        and(eq(publicationSchedule.articleId, articleRow.id), eq(publicationSchedule.status, "pending")),
      );
    await tx
      .update(article)
      .set({
        publishedRevisionId: null,
        workflowStatus: "unpublished",
        unpublishedAt: now,
        unpublishReason: reason,
        scheduledFor: null,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: now,
      })
      .where(eq(article.id, articleRow.id));

    await enqueueOutbox(tx, {
      eventType: "article.unpublished",
      idempotencyKey: `outbox:unpublish:${articleRow.id}:${now.getTime()}`,
      payload: { articleId: articleRow.id, revisionId, slug, reason, at: now.toISOString() },
    });

    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId,
      from: "published",
      to: "unpublished",
      reason,
      action: "article.unpublished",
      ipHash: params.ipHash,
    });
    return { slug };
  });

  await invalidatePublicContent([`/news/${result.slug}`]);
  await notifyNow(PUBLIC_EVENTS_CHANNEL, {
    type: "article.unpublished",
    slug: result.slug,
    at: new Date().toISOString(),
  });
  return result;
}

export async function archiveArticle(
  actorId: string,
  params: { articleId: string; reason?: string; ipHash?: string | null },
): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "article.archive");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (articleRow.workflowStatus === "published") {
      throw new WorkflowError("invalid_transition", "Unpublish the story before archiving it.");
    }
    if (articleRow.workflowStatus === "archived") return;
    await tx
      .update(publicationSchedule)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(
        and(eq(publicationSchedule.articleId, articleRow.id), eq(publicationSchedule.status, "pending")),
      );
    await tx
      .update(article)
      .set({
        workflowStatus: "archived",
        archivedAt: new Date(),
        scheduledFor: null,
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(article.id, articleRow.id));
    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId: articleRow.workingRevisionId,
      from: articleRow.workflowStatus,
      to: "archived",
      reason: params.reason ?? null,
      action: "article.archived",
      ipHash: params.ipHash,
    });
  });
}

export async function rejectArticle(
  actorId: string,
  params: { articleId: string; revisionId: string; reason: string; ipHash?: string | null },
): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.requestChanges");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (!["submitted", "in_review", "resubmitted"].includes(articleRow.workflowStatus)) {
      throw new WorkflowError("invalid_transition", "This story cannot be rejected from its current state.");
    }
    const reason = params.reason.trim();
    if (reason.length < 10) {
      throw new WorkflowError("validation", "Provide a rejection reason of at least 10 characters.");
    }
    const revision = await getRevision(tx, params.revisionId);
    await tx
      .update(editorialReview)
      .set({ invalidatedAt: new Date() })
      .where(and(eq(editorialReview.revisionId, revision.id), isNull(editorialReview.invalidatedAt)));
    await tx.insert(editorialReview).values({
      articleId: articleRow.id,
      revisionId: revision.id,
      editorId: actor.id,
      decision: "rejected",
      checklist: {},
      note: reason,
    });
    await tx
      .update(article)
      .set({
        workflowStatus: "rejected",
        lockVersion: articleRow.lockVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(article.id, articleRow.id));
    const authors = await getRevisionAuthorIds(tx, revision.id);
    await notifyUsers(tx, {
      userIds: authors,
      type: "article.rejected",
      title: "Story rejected",
      body: reason.slice(0, 180),
      link: `/studio/articles/${articleRow.id}`,
    });
    await logTransition(tx, {
      actorId: actor.id,
      articleId: articleRow.id,
      revisionId: revision.id,
      from: articleRow.workflowStatus,
      to: "rejected",
      reason,
      action: "article.rejected",
      ipHash: params.ipHash,
    });
  });
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------
export async function assignEditor(
  actorId: string,
  params: { articleId: string; editorId: string; dueAt?: Date | null },
): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.viewQueue");
    const articleRow = await getArticleForUpdate(tx, params.articleId);
    if (!articleRow.workingRevisionId) throw new WorkflowError("conflict", "No active revision.");
    const editorRows = await tx
      .select({ id: user.id, role: user.role, banned: user.banned })
      .from(user)
      .where(eq(user.id, params.editorId))
      .limit(1);
    const editor = editorRows[0];
    if (!editor || editor.banned) throw new WorkflowError("validation", "Editor not available.");
    if (!parseRoles(editor.role).some((r) => r === "editor" || r === "admin" || r === "super_admin")) {
      throw new WorkflowError("validation", "The selected user is not an editor.");
    }
    await tx
      .update(editorialAssignment)
      .set({ status: "reassigned", endedAt: new Date() })
      .where(
        and(
          eq(editorialAssignment.articleId, articleRow.id),
          eq(editorialAssignment.status, "active"),
        ),
      );
    await tx.insert(editorialAssignment).values({
      articleId: articleRow.id,
      revisionId: articleRow.workingRevisionId,
      editorId: params.editorId,
      assignedBy: actor.id,
      dueAt: params.dueAt ?? null,
    });
    await tx
      .update(article)
      .set({ assignedEditorId: params.editorId, updatedAt: new Date() })
      .where(eq(article.id, articleRow.id));
    await notifyUsers(tx, {
      userIds: [params.editorId],
      type: "article.assigned",
      title: "Story assigned to you",
      body: "You are now the editor for this story.",
      link: `/studio/articles/${articleRow.id}`,
      dedupeKey: `assigned:${articleRow.id}:${params.editorId}:${Date.now()}`,
    });
    await recordAudit(tx, {
      actorId: actor.id,
      action: "article.editor_assigned",
      entityType: "article",
      entityId: articleRow.id,
      articleId: articleRow.id,
      revisionId: articleRow.workingRevisionId,
      metadata: { editorId: params.editorId },
    });
  });
}

export async function revokeEditor(actorId: string, articleId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireActor(tx, actorId, "editorial.viewQueue");
    const articleRow = await getArticleForUpdate(tx, articleId);
    await tx
      .update(editorialAssignment)
      .set({ status: "revoked", endedAt: new Date() })
      .where(and(eq(editorialAssignment.articleId, articleId), eq(editorialAssignment.status, "active")));
    await tx
      .update(article)
      .set({ assignedEditorId: null, updatedAt: new Date() })
      .where(eq(article.id, articleId));
    await recordAudit(tx, {
      actorId: actor.id,
      action: "article.editor_unassigned",
      entityType: "article",
      entityId: articleId,
      articleId,
      revisionId: articleRow.workingRevisionId,
    });
  });
}

export { notifyNow };
