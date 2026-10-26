import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ---------------------------------------------------------------------------
// Authentication (Better Auth)
// ---------------------------------------------------------------------------
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    role: text("role").notNull().default("staff"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: ts("ban_expires"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    slug: text("slug"),
    title: text("title"),
    bio: text("bio"),
    lastLoginAt: ts("last_login_at"),
  },
  (t) => [uniqueIndex("user_email_unique").on(t.email), uniqueIndex("user_slug_unique").on(t.slug)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("session_token_unique").on(t.token),
    index("session_user_idx").on(t.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("account_user_idx").on(t.userId),
    uniqueIndex("account_provider_unique").on(t.providerId, t.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: ts("locked_until"),
  },
  (t) => [index("two_factor_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    name: text("name"),
    tokenHash: text("token_hash").notNull(),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: ts("expires_at").notNull(),
    acceptedAt: ts("accepted_at"),
    revokedAt: ts("revoked_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invitation_token_hash_unique").on(t.tokenHash)],
);

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export const mediaAsset = pgTable(
  "media_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storageDriver: text("storage_driver").notNull().default("local"),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    checksum: text("checksum"),
    alt: text("alt").notNull().default(""),
    caption: text("caption"),
    credit: text("credit"),
    rights: text("rights"),
    isPrivate: boolean("is_private").notNull().default(true),
    variants: jsonb("variants").notNull().default({}),
    blurDataUrl: text("blur_data_url"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("media_created_idx").on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------
export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind").notNull().default("news"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const tag = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Articles and revisions
// ---------------------------------------------------------------------------
export const article = pgTable(
  "article",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
    contentType: text("content_type").notNull().default("news"),
    workflowStatus: text("workflow_status").notNull().default("draft"),
    publishedRevisionId: uuid("published_revision_id"),
    workingRevisionId: uuid("working_revision_id"),
    featured: boolean("featured").notNull().default(false),
    featuredRank: integer("featured_rank").notNull().default(0),
    allowComments: boolean("allow_comments").notNull().default(true),
    commentsClosedAt: ts("comments_closed_at"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    assignedEditorId: text("assigned_editor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    publishedAt: ts("published_at"),
    scheduledFor: ts("scheduled_for"),
    archivedAt: ts("archived_at"),
    unpublishedAt: ts("unpublished_at"),
    unpublishReason: text("unpublish_reason"),
    lockVersion: integer("lock_version").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("article_workflow_idx").on(t.workflowStatus, t.updatedAt),
    index("article_published_idx").on(t.publishedAt),
  ],
);

export const articleRevision = pgTable(
  "article_revision",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    version: integer("version").notNull().default(1),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    summary: text("summary").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    bodyJson: jsonb("body_json"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    slugOverride: text("slug_override"),
    heroMediaId: uuid("hero_media_id").references(() => mediaAsset.id, { onDelete: "set null" }),
    heroCaption: text("hero_caption"),
    heroCredit: text("hero_credit"),
    heroAlt: text("hero_alt"),
    contentHash: text("content_hash").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    lockedAt: ts("locked_at"),
  },
  (t) => [uniqueIndex("article_revision_number_unique").on(t.articleId, t.revisionNumber)],
);

export const articleRevisionAuthor = pgTable(
  "article_revision_author",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => articleRevision.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bylineName: text("byline_name"),
    bylineOrder: integer("byline_order").notNull().default(0),
    authorRole: text("author_role").notNull().default("author"),
  },
  (t) => [uniqueIndex("article_revision_author_unique").on(t.revisionId, t.userId, t.authorRole)],
);

export const articleTag = pgTable(
  "article_tag",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.tagId] })],
);

export const editorialAssignment = pgTable(
  "editorial_assignment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => articleRevision.id, { onDelete: "cascade" }),
    editorId: text("editor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by").references(() => user.id, { onDelete: "set null" }),
    status: text("status").notNull().default("active"),
    dueAt: ts("due_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    endedAt: ts("ended_at"),
  },
  (t) => [index("editorial_assignment_editor_idx").on(t.editorId, t.status)],
);

export const editorialComment = pgTable(
  "editorial_comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => articleRevision.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    rootId: uuid("root_id"),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    anchorText: text("anchor_text"),
    anchorPath: text("anchor_path"),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: ts("resolved_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("editorial_comment_revision_idx").on(t.revisionId, t.createdAt)],
);

export const editorialReview = pgTable("editorial_review", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => article.id, { onDelete: "cascade" }),
  revisionId: uuid("revision_id")
    .notNull()
    .references(() => articleRevision.id, { onDelete: "cascade" }),
  editorId: text("editor_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  decision: text("decision").notNull(),
  checklist: jsonb("checklist").notNull().default({}),
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
  invalidatedAt: ts("invalidated_at"),
});

export const adminApproval = pgTable("admin_approval", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => article.id, { onDelete: "cascade" }),
  revisionId: uuid("revision_id")
    .notNull()
    .references(() => articleRevision.id, { onDelete: "cascade" }),
  adminId: text("admin_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  editorialReviewId: uuid("editorial_review_id").references(() => editorialReview.id, {
    onDelete: "set null",
  }),
  decision: text("decision").notNull(),
  reason: text("reason"),
  createdAt: ts("created_at").notNull().defaultNow(),
  invalidatedAt: ts("invalidated_at"),
});

export const workflowTransition = pgTable(
  "workflow_transition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => articleRevision.id, { onDelete: "set null" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("workflow_transition_article_idx").on(t.articleId, t.createdAt)],
);

export const publicationSchedule = pgTable("publication_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => article.id, { onDelete: "cascade" }),
  revisionId: uuid("revision_id")
    .notNull()
    .references(() => articleRevision.id, { onDelete: "cascade" }),
  scheduledFor: ts("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: ts("created_at").notNull().defaultNow(),
  processedAt: ts("processed_at"),
  cancelledAt: ts("cancelled_at"),
  lastError: text("last_error"),
});

export const articlePublication = pgTable(
  "article_publication",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => articleRevision.id, { onDelete: "cascade" }),
    scheduleId: uuid("schedule_id").references(() => publicationSchedule.id, {
      onDelete: "set null",
    }),
    publishedBy: text("published_by").references(() => user.id, { onDelete: "set null" }),
    publishedAt: ts("published_at").notNull().defaultNow(),
    unpublishedBy: text("unpublished_by").references(() => user.id, { onDelete: "set null" }),
    unpublishedAt: ts("unpublished_at"),
    unpublishReason: text("unpublish_reason"),
    isCurrent: boolean("is_current").notNull().default(true),
  },
  (t) => [index("article_publication_article_idx").on(t.articleId, t.publishedAt)],
);

// ---------------------------------------------------------------------------
// Public comments
// ---------------------------------------------------------------------------
export const publicComment = pgTable(
  "public_comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    ipHash: text("ip_hash"),
    reportCount: integer("report_count").notNull().default(0),
    moderatedBy: text("moderated_by").references(() => user.id, { onDelete: "set null" }),
    moderatedAt: ts("moderated_at"),
    moderationNote: text("moderation_note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("public_comment_article_idx").on(t.articleId, t.status, t.createdAt)],
);

export const commentModerationAction = pgTable("comment_moderation_action", {
  id: uuid("id").primaryKey().defaultRandom(),
  commentId: uuid("comment_id")
    .notNull()
    .references(() => publicComment.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  reason: text("reason"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Notifications, audit, settings
// ---------------------------------------------------------------------------
export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  readAt: ts("read_at"),
  dedupeKey: text("dedupe_key"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  articleId: uuid("article_id").references(() => article.id, { onDelete: "set null" }),
  revisionId: uuid("revision_id").references(() => articleRevision.id, { onDelete: "set null" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  reason: text("reason"),
  metadata: jsonb("metadata").notNull().default({}),
  ipHash: text("ip_hash"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const siteSetting = pgTable("site_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Institutional content
// ---------------------------------------------------------------------------
export const event = pgTable("event", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  descriptionHtml: text("description_html").notNull().default(""),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at"),
  timezone: text("timezone").notNull().default("Africa/Monrovia"),
  venue: text("venue"),
  organizer: text("organizer"),
  registrationUrl: text("registration_url"),
  isPublished: boolean("is_published").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const facultyProfile = pgTable("faculty_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  photoId: uuid("photo_id").references(() => mediaAsset.id, { onDelete: "set null" }),
  bio: text("bio").notNull().default(""),
  qualifications: text("qualifications"),
  teachingInterests: text("teaching_interests"),
  researchInterests: text("research_interests"),
  email: text("email"),
  phone: text("phone"),
  office: text("office"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const academicPage = pgTable("academic_page", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("program"),
  summary: text("summary").notNull().default(""),
  bodyHtml: text("body_html").notNull().default(""),
  linkUrl: text("link_url"),
  documentId: uuid("document_id").references(() => mediaAsset.id, { onDelete: "set null" }),
  orderIndex: integer("order_index").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const resourceDownload = pgTable("resource_download", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  fileId: uuid("file_id").references(() => mediaAsset.id, { onDelete: "set null" }),
  category: text("category").notNull().default("General"),
  isPublic: boolean("is_public").notNull().default(true),
  downloadCount: integer("download_count").notNull().default(0),
  uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const homepageSection = pgTable("homepage_section", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0),
  settings: jsonb("settings").notNull().default({}),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const announcement = pgTable("announcement", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  level: text("level").notNull().default("info"),
  linkLabel: text("link_label"),
  linkUrl: text("link_url"),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const advertisement = pgTable(
  "advertisement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    mediaId: uuid("media_id").references(() => mediaAsset.id, { onDelete: "set null" }),
    destinationUrl: text("destination_url"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    isActive: boolean("is_active").notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("advertisement_visible_idx").on(t.isActive, t.orderIndex)],
);

export const sitePage = pgTable("site_page", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  bodyHtml: text("body_html").notNull().default(""),
  section: text("section").notNull().default("page"),
  orderIndex: integer("order_index").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const newsletterSubscriber = pgTable("newsletter_subscriber", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("pending"),
  confirmTokenHash: text("confirm_token_hash"),
  ipHash: text("ip_hash"),
  createdAt: ts("created_at").notNull().defaultNow(),
  confirmedAt: ts("confirmed_at"),
  unsubscribedAt: ts("unsubscribed_at"),
});

export const redirect = pgTable("redirect", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(308),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Outbox and jobs
// ---------------------------------------------------------------------------
export const publicationOutbox = pgTable("publication_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: ts("available_at").notNull().defaultNow(),
  processedAt: ts("processed_at"),
  lastError: text("last_error"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const job = pgTable("job", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  status: text("status").notNull().default("pending"),
  runAt: ts("run_at").notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(8),
  lockedAt: ts("locked_at"),
  lockedBy: text("locked_by"),
  lastError: text("last_error"),
  idempotencyKey: text("idempotency_key"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export const analyticsSession = pgTable("analytics_session", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  startedAt: ts("started_at").notNull().defaultNow(),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  pageViews: integer("page_views").notNull().default(0),
  isStaff: boolean("is_staff").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  device: text("device"),
  country: text("country"),
  referrerHost: text("referrer_host"),
  source: text("source"),
  landingPath: text("landing_path"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
});

export const analyticsEvent = pgTable("analytics_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  type: text("type").notNull(),
  path: text("path"),
  articleId: uuid("article_id").references(() => article.id, { onDelete: "set null" }),
  referrer: text("referrer"),
  source: text("source"),
  device: text("device"),
  country: text("country"),
  durationMs: integer("duration_ms"),
  scrollDepth: integer("scroll_depth"),
  metadata: jsonb("metadata").notNull().default({}),
  isStaff: boolean("is_staff").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const analyticsSearch = pgTable("analytics_search", {
  id: uuid("id").primaryKey().defaultRandom(),
  term: text("term").notNull(),
  resultCount: integer("result_count").notNull().default(0),
  path: text("path"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const analyticsSiteDaily = pgTable("analytics_site_daily", {
  day: date("day", { mode: "string" }).primaryKey(),
  pageViews: integer("page_views").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  sessions: integer("sessions").notNull().default(0),
  engagedSeconds: integer("engaged_seconds").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  downloads: integer("downloads").notNull().default(0),
  searches: integer("searches").notNull().default(0),
  noResultSearches: integer("no_result_searches").notNull().default(0),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const analyticsArticleDaily = pgTable(
  "analytics_article_daily",
  {
    day: date("day", { mode: "string" }).notNull(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => article.id, { onDelete: "cascade" }),
    views: integer("views").notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    engagedSeconds: integer("engaged_seconds").notNull().default(0),
    scroll50: integer("scroll_50").notNull().default(0),
    scroll75: integer("scroll_75").notNull().default(0),
    scroll100: integer("scroll_100").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    downloads: integer("downloads").notNull().default(0),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.day, t.articleId] })],
);

export const analyticsTrafficDaily = pgTable(
  "analytics_traffic_daily",
  {
    day: date("day", { mode: "string" }).notNull(),
    dimension: text("dimension").notNull(),
    value: text("value").notNull(),
    views: integer("views").notNull().default(0),
    uniques: integer("uniques").notNull().default(0),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.day, t.dimension, t.value] })],
);

export const analyticsIngestGuard = pgTable("analytics_ingest_guard", {
  bucket: text("bucket").primaryKey(),
  count: integer("count").notNull().default(0),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const schema = {
  user,
  session,
  account,
  verification,
  twoFactor,
};

export const articleRevisionMedia = pgTable(
  "article_revision_media",
  {
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => articleRevision.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAsset.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.revisionId, t.mediaId] })],
);

export const contactMessage = pgTable("contact_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("new"),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: ts("created_at").notNull().defaultNow(),
});
