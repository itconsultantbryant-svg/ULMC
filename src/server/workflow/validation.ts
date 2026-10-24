import { z } from "zod";

export const CONTENT_TYPES = [
  "news",
  "campus",
  "education",
  "community",
  "media_society",
  "research",
  "feature",
  "opinion",
  "student",
  "announcement",
  "sponsored",
] as const;

export const CONTENT_TYPE_LABELS: Record<(typeof CONTENT_TYPES)[number], string> = {
  news: "Department news",
  campus: "Campus news",
  education: "Education",
  community: "Community reporting",
  media_society: "Media and society",
  research: "Research",
  feature: "Feature",
  opinion: "Opinion and analysis",
  student: "Student journalism",
  announcement: "Announcement",
  sponsored: "Sponsored",
};

const uuid = z.string().uuid();
const optionalUrl = z.string().url().max(500).or(z.literal("")).optional();

export const articleInputSchema = z.object({
  title: z.string().trim().min(3, "Headline must be at least 3 characters").max(180),
  subtitle: z.string().trim().max(240).optional().default(""),
  summary: z
    .string()
    .trim()
    .min(10, "Add a short summary of at least 10 characters")
    .max(600, "Summary must be 600 characters or fewer"),
  bodyHtml: z.string().min(1, "Article body is required").max(400_000),
  bodyJson: z.unknown().optional(),
  categoryId: uuid,
  contentType: z.enum(CONTENT_TYPES),
  authorIds: z.array(z.string().min(1)).max(12).optional(),
  tagNames: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  heroMediaId: uuid.nullish(),
  heroAlt: z.string().trim().max(300).optional().default(""),
  heroCaption: z.string().trim().max(400).optional().default(""),
  heroCredit: z.string().trim().max(200).optional().default(""),
  seoTitle: z.string().trim().max(80).optional().default(""),
  seoDescription: z.string().trim().max(200).optional().default(""),
  canonicalUrl: optionalUrl,
  allowComments: z.boolean().optional().default(true),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(90)
    .optional(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

export const editorialChecklistSchema = z.object({
  sources_verified: z.boolean(),
  image_rights: z.boolean(),
  captions_credit: z.boolean(),
  accessibility: z.boolean(),
  quality: z.boolean(),
  notes: z.string().max(2000).optional(),
});

export const scheduleSchema = z.object({
  scheduledFor: z.coerce.date(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(2).max(4000),
  parentId: uuid.optional().nullable(),
  anchorText: z.string().max(300).optional(),
  anchorPath: z.string().max(300).optional(),
});

export const publicCommentSchema = z.object({
  articleId: uuid,
  parentId: uuid.optional().nullable(),
  authorName: z.string().trim().min(2, "Please add your name").max(80),
  authorEmail: z.string().trim().email("Enter a valid email address").max(160).optional().or(z.literal("")),
  body: z.string().trim().min(4, "Comment is too short").max(3000),
  honeypot: z.string().max(0).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(80).optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  author: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  from: z.string().max(20).optional(),
  to: z.string().max(20).optional(),
});
