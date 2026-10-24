import { and, asc, desc, eq, isNotNull, isNull, gte, lt, lte, inArray, notInArray, sql, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  academicPage,
  announcement,
  article,
  articleRevision,
  articleRevisionAuthor,
  articleTag,
  category,
  event,
  facultyProfile,
  homepageSection,
  mediaAsset,
  newsletterSubscriber,
  redirect,
  resourceDownload,
  sitePage,
  tag,
  user,
} from "@/server/db/schema";
import { cached, PUBLIC_CONTENT_TAG } from "@/server/cache";
import { readSiteSettings, type SiteSettings } from "@/server/settings";

export type PublicAuthor = {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  bio: string | null;
  image: string | null;
};

export type PublicMedia = {
  id: string;
  alt: string;
  caption: string | null;
  credit: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

export type PublicArticleCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string;
  publishedAt: Date;
  contentType: string;
  readingMinutes: number;
  category: { slug: string; name: string } | null;
  hero: PublicMedia | null;
  authors: PublicAuthor[];
  isOpinion: boolean;
};

export type PublicArticle = PublicArticleCard & {
  bodyHtml: string;
  updatedAt: Date;
  wordCount: number;
  allowComments: boolean;
  commentsClosed: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  revisionId: string;
  tags: { slug: string; name: string }[];
};

const liveWhere = and(isNotNull(article.publishedRevisionId), isNull(article.unpublishedAt));

function authorSlug(row: { slug: string | null; name: string; id: string }): string {
  return row.slug ?? row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function hydrateAuthors(articleIds: string[]): Promise<Map<string, PublicAuthor[]>> {
  const map = new Map<string, PublicAuthor[]>();
  if (articleIds.length === 0) return map;
  const rows = await db
    .select({
      articleId: articleRevision.articleId,
      id: user.id,
      name: user.name,
      slug: user.slug,
      title: user.title,
      bio: user.bio,
      image: user.image,
      bylineName: articleRevisionAuthor.bylineName,
      order: articleRevisionAuthor.bylineOrder,
    })
    .from(article)
    .innerJoin(articleRevision, eq(articleRevision.id, article.publishedRevisionId))
    .innerJoin(articleRevisionAuthor, eq(articleRevisionAuthor.revisionId, articleRevision.id))
    .innerJoin(user, eq(user.id, articleRevisionAuthor.userId))
    .where(inArray(article.id, articleIds))
    .orderBy(asc(articleRevisionAuthor.bylineOrder));
  for (const row of rows) {
    const list = map.get(row.articleId) ?? [];
    list.push({
      id: row.id,
      name: row.bylineName || row.name,
      slug: authorSlug(row),
      title: row.title,
      bio: row.bio,
      image: row.image,
    });
    map.set(row.articleId, list);
  }
  return map;
}

async function hydrateHero(rows: { id: string; heroMediaId: string | null }[]): Promise<Map<string, PublicMedia>> {
  const map = new Map<string, PublicMedia>();
  const mediaIds = [...new Set(rows.map((r) => r.heroMediaId).filter(Boolean))] as string[];
  if (mediaIds.length === 0) return map;
  const assets = await db
    .select({
      id: mediaAsset.id,
      alt: mediaAsset.alt,
      caption: mediaAsset.caption,
      credit: mediaAsset.credit,
      width: mediaAsset.width,
      height: mediaAsset.height,
      blurDataUrl: mediaAsset.blurDataUrl,
    })
    .from(mediaAsset)
    .where(inArray(mediaAsset.id, mediaIds));
  const byId = new Map(assets.map((a) => [a.id, a]));
  for (const row of rows) {
    if (!row.heroMediaId) continue;
    const asset = byId.get(row.heroMediaId);
    if (!asset) continue;
    map.set(row.id, {
      id: asset.id,
      alt: asset.alt,
      caption: asset.caption,
      credit: asset.credit,
      width: asset.width,
      height: asset.height,
      blurDataUrl: asset.blurDataUrl,
    });
  }
  return map;
}

type ListOptions = {
  categorySlug?: string;
  contentType?: string;
  tagSlug?: string;
  authorId?: string;
  query?: string;
  excludeIds?: string[];
  multimediaOnly?: boolean;
  limit?: number;
  offset?: number;
  order?: "newest" | "oldest";
  useCache?: boolean;
};

async function listPublished(opts: ListOptions): Promise<PublicArticleCard[]> {
  const limit = Math.min(opts.limit ?? 12, 60);
  const offset = opts.offset ?? 0;
  const conditions = [liveWhere];
  if (opts.categorySlug) conditions.push(eq(category.slug, opts.categorySlug));
  if (opts.contentType) conditions.push(eq(article.contentType, opts.contentType));
  if (opts.authorId) conditions.push(eq(articleRevisionAuthor.userId, opts.authorId));
  if (opts.excludeIds && opts.excludeIds.length > 0) {
    conditions.push(notInArray(article.id, opts.excludeIds));
  }
  if (opts.tagSlug) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM article_tag at JOIN tag t ON t.id = at.tag_id WHERE at.article_id = ${article.id} AND t.slug = ${opts.tagSlug})`,
    );
  }
  if (opts.query) {
    conditions.push(
      sql`to_tsvector('english', coalesce(${articleRevision.title},'') || ' ' || coalesce(${articleRevision.summary},'') || ' ' || regexp_replace(coalesce(${articleRevision.bodyHtml},''), '<[^>]+>', ' ', 'g')) @@ websearch_to_tsquery('english', ${opts.query})`,
    );
  }
  if (opts.multimediaOnly) {
    conditions.push(
      sql`(${articleRevision.bodyHtml} ILIKE '%<video%' OR ${articleRevision.bodyHtml} ILIKE '%<iframe%' OR ${articleRevision.bodyHtml} ILIKE '%<audio%')`,
    );
  }

  const rows = await db
    .select({
      id: article.id,
      slug: article.slug,
      title: articleRevision.title,
      subtitle: articleRevision.subtitle,
      summary: articleRevision.summary,
      publishedAt: article.publishedAt,
      createdAt: article.createdAt,
      contentType: article.contentType,
      readingMinutes: articleRevision.readingMinutes,
      heroMediaId: articleRevision.heroMediaId,
      categorySlug: category.slug,
      categoryName: category.name,
    })
    .from(article)
    .innerJoin(articleRevision, eq(articleRevision.id, article.publishedRevisionId))
    .leftJoin(category, eq(category.id, article.categoryId))
    .leftJoin(articleRevisionAuthor, eq(articleRevisionAuthor.revisionId, articleRevision.id))
    .where(and(...conditions))
    .groupBy(article.id, articleRevision.id, category.slug, category.name)
    .orderBy(
      opts.order === "oldest"
        ? asc(article.publishedAt)
        : desc(article.publishedAt),
    )
    .limit(limit)
    .offset(offset);

  const [authors, heroes] = await Promise.all([
    hydrateAuthors(rows.map((r) => r.id)),
    hydrateHero(rows.map((r) => ({ id: r.id, heroMediaId: r.heroMediaId }))),
  ]);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    publishedAt: row.publishedAt ?? row.createdAt,
    contentType: row.contentType,
    readingMinutes: row.readingMinutes,
    category: row.categorySlug ? { slug: row.categorySlug, name: row.categoryName ?? "" } : null,
    hero: heroes.get(row.id) ?? null,
    authors: authors.get(row.id) ?? [],
    isOpinion: row.contentType === "opinion",
  }));
}

export async function getLatestArticles(opts: ListOptions = {}): Promise<PublicArticleCard[]> {
  const key = `articles:${JSON.stringify(opts)}`;
  if (opts.useCache === false) return listPublished(opts);
  return cached(key, [PUBLIC_CONTENT_TAG], 20_000, () => listPublished(opts));
}

export async function countPublished(opts: Omit<ListOptions, "limit" | "offset"> = {}): Promise<number> {
  const conditions = [liveWhere];
  if (opts.categorySlug) conditions.push(eq(category.slug, opts.categorySlug));
  if (opts.contentType) conditions.push(eq(article.contentType, opts.contentType));
  if (opts.query) {
    conditions.push(
      sql`to_tsvector('english', coalesce(${articleRevision.title},'') || ' ' || coalesce(${articleRevision.summary},'') || ' ' || regexp_replace(coalesce(${articleRevision.bodyHtml},''), '<[^>]+>', ' ', 'g')) @@ websearch_to_tsquery('english', ${opts.query})`,
    );
  }
  if (opts.multimediaOnly) {
    conditions.push(
      sql`(${articleRevision.bodyHtml} ILIKE '%<video%' OR ${articleRevision.bodyHtml} ILIKE '%<iframe%' OR ${articleRevision.bodyHtml} ILIKE '%<audio%')`,
    );
  }
  const rows = await db
    .select({ count: sql<number>`count(distinct ${article.id})` })
    .from(article)
    .innerJoin(articleRevision, eq(articleRevision.id, article.publishedRevisionId))
    .leftJoin(category, eq(category.id, article.categoryId))
    .where(and(...conditions));
  return Number(rows[0]?.count ?? 0);
}

export async function getArticleBySlug(slug: string): Promise<PublicArticle | null> {
  const rows = await db
    .select({
      id: article.id,
      slug: article.slug,
      bodyHtml: articleRevision.bodyHtml,
      title: articleRevision.title,
      subtitle: articleRevision.subtitle,
      summary: articleRevision.summary,
      publishedAt: article.publishedAt,
      updatedAt: articleRevision.createdAt,
      contentType: article.contentType,
      readingMinutes: articleRevision.readingMinutes,
      wordCount: articleRevision.wordCount,
      allowComments: article.allowComments,
      commentsClosedAt: article.commentsClosedAt,
      seoTitle: articleRevision.seoTitle,
      seoDescription: articleRevision.seoDescription,
      canonicalUrl: articleRevision.canonicalUrl,
      revisionId: articleRevision.id,
      heroMediaId: articleRevision.heroMediaId,
      categorySlug: category.slug,
      categoryName: category.name,
    })
    .from(article)
    .innerJoin(articleRevision, eq(articleRevision.id, article.publishedRevisionId))
    .leftJoin(category, eq(category.id, article.categoryId))
    .where(and(eq(article.slug, slug), liveWhere))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const [authors, heroes, tags, settings] = await Promise.all([
    hydrateAuthors([row.id]),
    hydrateHero([{ id: row.id, heroMediaId: row.heroMediaId }]),
    db
      .select({ slug: tag.slug, name: tag.name })
      .from(articleTag)
      .innerJoin(tag, eq(tag.id, articleTag.tagId))
      .where(eq(articleTag.articleId, row.id)),
    readSiteSettings(),
  ]);

  const closedByAge =
    settings.commentsAutoCloseDays > 0 &&
    row.publishedAt != null &&
    Date.now() - row.publishedAt.getTime() > settings.commentsAutoCloseDays * 86_400_000;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    bodyHtml: row.bodyHtml,
    publishedAt: row.publishedAt ?? new Date(),
    updatedAt: row.updatedAt,
    contentType: row.contentType,
    readingMinutes: row.readingMinutes,
    wordCount: row.wordCount,
    allowComments: row.allowComments,
    commentsClosed: Boolean(row.commentsClosedAt) || closedByAge,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalUrl: row.canonicalUrl,
    revisionId: row.revisionId,
    category: row.categorySlug ? { slug: row.categorySlug, name: row.categoryName ?? "" } : null,
    hero: heroes.get(row.id) ?? null,
    authors: authors.get(row.id) ?? [],
    isOpinion: row.contentType === "opinion",
    tags,
  };
}

export async function getRelatedArticles(articleId: string, categorySlug?: string): Promise<PublicArticleCard[]> {
  const rows = await listPublished({
    categorySlug,
    excludeIds: [articleId],
    limit: 4,
    useCache: false,
  });
  if (rows.length >= 3) return rows.slice(0, 3);
  const extra = await listPublished({ excludeIds: [articleId, ...rows.map((r) => r.id)], limit: 3 - rows.length, useCache: false });
  return [...rows, ...extra];
}

export async function getCategories() {
  return cached("categories:all", [PUBLIC_CONTENT_TAG], 120_000, async () =>
    db
      .select({ id: category.id, slug: category.slug, name: category.name, description: category.description, kind: category.kind })
      .from(category)
      .where(eq(category.isActive, true))
      .orderBy(asc(category.orderIndex), asc(category.name)),
  );
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db.select().from(category).where(eq(category.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getAuthors() {
  return cached("authors:all", [PUBLIC_CONTENT_TAG], 60_000, async () => {
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        slug: user.slug,
        title: user.title,
        bio: user.bio,
        image: user.image,
        role: user.role,
      })
      .from(user)
      .where(
        and(
          eq(user.banned, false),
          sql`exists (
            select 1 from article_revision_author ara
            join article_revision ar on ar.id = ara.revision_id
            join article a on a.published_revision_id = ar.id
            where ara.user_id = ${user.id} and a.unpublished_at is null
          )`,
        ),
      )
      .orderBy(asc(user.name));
    return rows.map((r) => ({ ...r, slug: authorSlug(r) }));
  });
}

export async function getAuthorBySlug(slug: string) {
  const rows = await db.select().from(user).where(eq(user.slug, slug)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? slug,
    title: row.title,
    bio: row.bio,
    image: row.image,
  };
}

export async function getAuthorArticles(authorId: string): Promise<PublicArticleCard[]> {
  return listPublished({ authorId, limit: 24, useCache: false });
}

export async function getActiveAnnouncement() {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcement)
    .where(
      and(
        eq(announcement.isActive, true),
        or(isNull(announcement.startsAt), lte(announcement.startsAt, now)),
        or(isNull(announcement.endsAt), gte(announcement.endsAt, now)),
      ),
    )
    .orderBy(desc(announcement.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getHomepageSections() {
  return cached("home:sections", [PUBLIC_CONTENT_TAG], 60_000, async () => {
    const rows = await db.select().from(homepageSection).orderBy(asc(homepageSection.orderIndex));
    return rows;
  });
}

export async function getHomepage(): Promise<{
  sections: Awaited<ReturnType<typeof getHomepageSections>>;
  lead: PublicArticleCard | null;
  supporting: PublicArticleCard[];
  latest: PublicArticleCard[];
  student: PublicArticleCard[];
  multimedia: PublicArticleCard[];
  categories: Awaited<ReturnType<typeof getCategories>>;
  events: Awaited<ReturnType<typeof getUpcomingEvents>>;
  settings: SiteSettings;
  announcements: (typeof announcement.$inferSelect)[];
}> {
  const [sections, featured, latest, student, multimedia, categories, events, settings, announcementRow] =
    await Promise.all([
      getHomepageSections(),
      getLatestArticles({ limit: 4 }),
      getLatestArticles({ limit: 8 }),
      getLatestArticles({ contentType: "student", limit: 4 }),
      getLatestArticles({ multimediaOnly: true, limit: 3 }),
      getCategories(),
      getUpcomingEvents(4),
      readSiteSettings(),
      getVisibleAnnouncements(2),
    ]);

  const lead = featured[0] ?? latest[0] ?? null;
  const supporting = (featured.length > 1 ? featured.slice(1) : latest.slice(1)).filter(
    (a) => a.id !== lead?.id,
  ).slice(0, 2);
  const exclude = new Set([lead?.id, ...supporting.map((a) => a.id)].filter(Boolean) as string[]);

  return {
    sections,
    lead,
    supporting,
    latest: latest.filter((a) => !exclude.has(a.id)).slice(0, 6),
    student,
    multimedia,
    categories,
    events,
    settings,
    announcements: announcementRow,
  };
}

export async function getVisibleAnnouncements(limit = 5) {
  const now = new Date();
  return cached(`announcements:${limit}`, [PUBLIC_CONTENT_TAG], 30_000, async () =>
    db
      .select()
      .from(announcement)
      .where(
        and(
          eq(announcement.isActive, true),
          or(isNull(announcement.startsAt), lte(announcement.startsAt, now)),
          or(isNull(announcement.endsAt), gte(announcement.endsAt, now)),
        ),
      )
      .orderBy(desc(announcement.createdAt))
      .limit(limit),
  );
}

export async function getUpcomingEvents(limit = 20) {
  return cached(`events:upcoming:${limit}`, [PUBLIC_CONTENT_TAG], 30_000, async () =>
    db
      .select()
      .from(event)
      .where(and(eq(event.isPublished, true), gte(event.startsAt, new Date())))
      .orderBy(asc(event.startsAt))
      .limit(limit),
  );
}

export async function getPastEvents(limit = 20) {
  return cached(`events:past:${limit}`, [PUBLIC_CONTENT_TAG], 60_000, async () =>
    db
      .select()
      .from(event)
      .where(and(eq(event.isPublished, true), lt(event.startsAt, new Date())))
      .orderBy(desc(event.startsAt))
      .limit(limit),
  );
}

export async function getEventBySlug(slug: string) {
  const rows = await db
    .select()
    .from(event)
    .where(and(eq(event.slug, slug), eq(event.isPublished, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFaculty() {
  return cached("faculty:all", [PUBLIC_CONTENT_TAG], 60_000, async () =>
    db
      .select({
        id: facultyProfile.id,
        slug: facultyProfile.slug,
        name: facultyProfile.name,
        role: facultyProfile.role,
        bio: facultyProfile.bio,
        qualifications: facultyProfile.qualifications,
        teachingInterests: facultyProfile.teachingInterests,
        researchInterests: facultyProfile.researchInterests,
        email: facultyProfile.email,
        phone: facultyProfile.phone,
        office: facultyProfile.office,
        photo: {
          id: mediaAsset.id,
          alt: mediaAsset.alt,
          width: mediaAsset.width,
          height: mediaAsset.height,
          blurDataUrl: mediaAsset.blurDataUrl,
        },
      })
      .from(facultyProfile)
      .leftJoin(mediaAsset, eq(mediaAsset.id, facultyProfile.photoId))
      .where(eq(facultyProfile.isActive, true))
      .orderBy(asc(facultyProfile.orderIndex), asc(facultyProfile.name))
      .then((rows) => rows.map((r) => ({ ...r, photo: r.photo?.id ? r.photo : null }))),
  );
}

export async function getAcademicPages() {
  return cached("academics:all", [PUBLIC_CONTENT_TAG], 60_000, async () =>
    db
      .select({
        id: academicPage.id,
        slug: academicPage.slug,
        title: academicPage.title,
        kind: academicPage.kind,
        summary: academicPage.summary,
        bodyHtml: academicPage.bodyHtml,
        linkUrl: academicPage.linkUrl,
        orderIndex: academicPage.orderIndex,
        document: {
          id: mediaAsset.id,
          originalName: mediaAsset.originalName,
          mimeType: mediaAsset.mimeType,
        },
      })
      .from(academicPage)
      .leftJoin(mediaAsset, eq(mediaAsset.id, academicPage.documentId))
      .where(eq(academicPage.isPublished, true))
      .orderBy(asc(academicPage.orderIndex), asc(academicPage.title))
      .then((rows) => rows.map((r) => ({ ...r, document: r.document?.id ? r.document : null }))),
  );
}

export async function getAcademicPageBySlug(slug: string) {
  const rows = await db
    .select({
      page: academicPage,
      document: {
        id: mediaAsset.id,
        originalName: mediaAsset.originalName,
        mimeType: mediaAsset.mimeType,
      },
    })
    .from(academicPage)
    .leftJoin(mediaAsset, eq(mediaAsset.id, academicPage.documentId))
    .where(and(eq(academicPage.slug, slug), eq(academicPage.isPublished, true)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row.page, document: row.document?.id ? row.document : null };
}

export async function getResources() {
  return cached("resources:all", [PUBLIC_CONTENT_TAG], 60_000, async () =>
    db
      .select({
        id: resourceDownload.id,
        title: resourceDownload.title,
        description: resourceDownload.description,
        category: resourceDownload.category,
        downloadCount: resourceDownload.downloadCount,
        createdAt: resourceDownload.createdAt,
        file: {
          id: mediaAsset.id,
          originalName: mediaAsset.originalName,
          mimeType: mediaAsset.mimeType,
          sizeBytes: mediaAsset.sizeBytes,
        },
      })
      .from(resourceDownload)
      .leftJoin(mediaAsset, eq(mediaAsset.id, resourceDownload.fileId))
      .where(eq(resourceDownload.isPublic, true))
      .orderBy(asc(resourceDownload.category), asc(resourceDownload.title))
      .then((rows) => rows.map((r) => ({ ...r, file: r.file?.id ? r.file : null }))),
  );
}

export async function getSitePage(slug: string) {
  const rows = await db
    .select()
    .from(sitePage)
    .where(and(eq(sitePage.slug, slug), eq(sitePage.isPublished, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSitePages(section?: string) {
  const conditions = [eq(sitePage.isPublished, true)];
  if (section) conditions.push(eq(sitePage.section, section));
  return db
    .select()
    .from(sitePage)
    .where(and(...conditions))
    .orderBy(asc(sitePage.orderIndex), asc(sitePage.title));
}

export async function getTagBySlug(slug: string) {
  const rows = await db.select().from(tag).where(eq(tag.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getTags(limit = 24) {
  return cached(`tags:${limit}`, [PUBLIC_CONTENT_TAG], 120_000, async () =>
    db
      .select({
        slug: tag.slug,
        name: tag.name,
        count: sql<number>`count(distinct ${article.id})`,
      })
      .from(tag)
      .innerJoin(articleTag, eq(articleTag.tagId, tag.id))
      .innerJoin(article, eq(article.id, articleTag.articleId))
      .where(liveWhere)
      .groupBy(tag.id, tag.slug, tag.name)
      .orderBy(desc(sql`count(distinct ${article.id})`), asc(tag.name))
      .limit(limit),
  );
}

export async function searchPublished(query: string, limit = 12, offset = 0) {
  const results = await listPublished({ query, limit, offset, useCache: false });
  const total = await countPublished({ query });
  return { results, total };
}

export async function getSitemapEntries() {
  const [articles, cats, pages, authors] = await Promise.all([
    db
      .select({ slug: article.slug, publishedAt: article.publishedAt })
      .from(article)
      .where(liveWhere)
      .orderBy(desc(article.publishedAt)),
    db.select({ slug: category.slug }).from(category).where(eq(category.isActive, true)),
    db.select({ slug: sitePage.slug }).from(sitePage).where(eq(sitePage.isPublished, true)),
    db.select({ slug: user.slug }).from(user).where(and(isNotNull(user.slug), eq(user.banned, false))),
  ]);
  return { articles, categories: cats, pages, authors };
}

export async function getFeedArticles(limit = 30) {
  return listPublished({ limit, useCache: false });
}

export async function resolveRedirect(path: string) {
  const rows = await db.select().from(redirect).where(eq(redirect.fromPath, path)).limit(1);
  return rows[0] ?? null;
}

export async function getNewsletterCount() {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.status, "confirmed"));
  return Number(rows[0]?.count ?? 0);
}

export async function getAuthorPublishedCount(authorId: string) {
  const rows = await db
    .select({ count: sql<number>`count(distinct ${article.id})` })
    .from(article)
    .innerJoin(articleRevision, eq(articleRevision.id, article.publishedRevisionId))
    .innerJoin(articleRevisionAuthor, eq(articleRevisionAuthor.revisionId, articleRevision.id))
    .where(and(eq(articleRevisionAuthor.userId, authorId), liveWhere));
  return Number(rows[0]?.count ?? 0);
}

export function articleUrl(slug: string) {
  return `/news/${slug}`;
}
