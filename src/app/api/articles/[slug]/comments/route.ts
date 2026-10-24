import { and, asc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { article, publicComment, user } from "@/server/db/schema";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { clientIp, hashIp, isLikelyBot } from "@/server/ids";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";
import { notifyUsers } from "@/server/notifications";
import { readSiteSettings } from "@/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findArticle(slug: string) {
  const rows = await db
    .select({
      id: article.id,
      slug: article.slug,
      allowComments: article.allowComments,
      commentsClosedAt: article.commentsClosedAt,
      publishedAt: article.publishedAt,
    })
    .from(article)
    .where(
      and(
        eq(article.slug, slug),
        isNull(article.unpublishedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const row = await findArticle(slug);
    if (!row || !row.publishedAt) throw new HttpError(404, "Story not found.");

    const settings = await readSiteSettings();
    const closedByAge =
      settings.commentsAutoCloseDays > 0 &&
      Date.now() - row.publishedAt.getTime() > settings.commentsAutoCloseDays * 86_400_000;
    const commentsClosed = Boolean(row.commentsClosedAt) || closedByAge || !row.allowComments;

    const comments = commentsClosed
      ? []
      : await db
          .select({
            id: publicComment.id,
            displayName: publicComment.authorName,
            body: publicComment.body,
            createdAt: publicComment.createdAt,
          })
          .from(publicComment)
          .where(and(eq(publicComment.articleId, row.id), eq(publicComment.status, "approved")))
          .orderBy(asc(publicComment.createdAt))
          .limit(100);

    return Response.json(
      { comments, commentsClosed },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  body: z.string().trim().min(2).max(4000),
  consent: z.literal(true),
  website: z.string().max(200).optional().default(""),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ip = clientIp(request.headers);
    if (isLikelyBot(request.headers.get("user-agent"))) {
      return Response.json({ ok: true, message: "Thank you. Your comment will be reviewed." });
    }
    const limited = rateLimit(`comment:${ip ?? "unknown"}`, 3, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const row = await findArticle(slug);
    if (!row || !row.publishedAt) throw new HttpError(404, "Story not found.");

    const settings = await readSiteSettings();
    const closedByAge =
      settings.commentsAutoCloseDays > 0 &&
      Date.now() - row.publishedAt.getTime() > settings.commentsAutoCloseDays * 86_400_000;
    if (!row.allowComments || row.commentsClosedAt || closedByAge) {
      throw new HttpError(403, "Comments are closed for this story.");
    }

    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(400, "Please include a name, a valid email address and a comment.");
    }
    if (parsed.data.website) {
      return Response.json({ ok: true, message: "Thank you. Your comment will be reviewed." });
    }

    await db.insert(publicComment).values({
      articleId: row.id,
      authorName: parsed.data.name,
      authorEmail: parsed.data.email.toLowerCase(),
      body: parsed.data.body,
      ipHash: hashIp(ip),
      status: "pending",
    });

    const moderators = await db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.banned, false),
          or(
            like(user.role, "%editor%"),
            like(user.role, "%admin%"),
            inArray(user.role, ["editor", "admin", "super_admin"]),
          ),
        ),
      )
      .limit(50);
    if (moderators.length > 0) {
      await notifyUsers(db, {
        userIds: moderators.map((m) => m.id),
        type: "comment.pending",
        title: "New comment awaiting moderation",
        body: `A reader commented on the story at /news/${row.slug}.`,
        link: "/studio/comments",
      }).catch((error) => console.error("Failed to notify moderators", error));
    }

    return Response.json(
      {
        ok: true,
        message: "Thank you. Your comment has been received and will appear after moderation.",
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
