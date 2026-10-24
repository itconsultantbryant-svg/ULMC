import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, sqlClient } from "@/server/db/client";
import { analyticsEvent, analyticsSession, article } from "@/server/db/schema";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { isLikelyBot } from "@/server/ids";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = ["pageview", "engagement", "scroll", "share", "download", "search", "outbound"] as const;

const schema = z.object({
  eventId: z.string().min(8).max(80),
  sessionId: z.string().min(8).max(80),
  visitorId: z.string().min(8).max(80),
  type: z.enum(TYPES),
  path: z.string().min(1).max(600),
  referrer: z.string().max(1000).optional().default(""),
  articleSlug: z.string().max(200).optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  scrollDepth: z.number().int().min(0).max(100).optional(),
  searchTerm: z.string().max(200).optional(),
  resultCount: z.number().int().min(0).max(100000).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

function deviceFromUa(ua: string | null): string {
  if (!ua) return "unknown";
  if (/ipad|tablet|kindle|silk/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function referrerHost(value: string, siteHost: string): { host: string | null; source: string } {
  if (!value) return { host: null, source: "direct" };
  try {
    const url = new URL(value);
    if (url.host === siteHost) return { host: url.host, source: "internal" };
    const host = url.host.toLowerCase();
    const social = /(facebook|instagram|twitter|x\.com|linkedin|youtube|tiktok|whatsapp|telegram)/;
    const search = /(google|bing|duckduckgo|yahoo|ecosia|yandex)/;
    if (social.test(host)) return { host, source: "social" };
    if (search.test(host)) return { host, source: "search" };
    return { host, source: "referral" };
  } catch {
    return { host: null, source: "direct" };
  }
}

export async function POST(request: Request) {
  try {
    const ua = request.headers.get("user-agent");
    if (isLikelyBot(ua)) return Response.json({ ok: true });

    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Invalid analytics event.");
    const data = parsed.data;

    if (!data.path.startsWith("/") || data.path.startsWith("/studio") || data.path.startsWith("/setup") || data.path.startsWith("/preview")) {
      return Response.json({ ok: true });
    }

    const limited = rateLimit(`analytics:${data.sessionId}`, 120, 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const host = request.headers.get("host") ?? "";
    const ref = referrerHost(data.referrer, host);
    const device = deviceFromUa(ua);
    const country =
      request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country") ?? null;
    const isStaffCookie = request.headers.get("cookie")?.includes("better-auth.session_token") ?? false;
    const isStaff = isStaffCookie;

    let articleId: string | null = null;
    if (data.articleSlug) {
      const rows = await db
        .select({ id: article.id })
        .from(article)
        .where(eq(article.slug, data.articleSlug))
        .limit(1);
      articleId = rows[0]?.id ?? null;
    }

    const inserted = await db
      .insert(analyticsEvent)
      .values({
        eventId: data.eventId,
        sessionId: data.sessionId,
        visitorId: data.visitorId,
        type: data.type,
        path: data.path.slice(0, 600),
        articleId,
        referrer: ref.host,
        source: ref.source,
        device,
        country,
        durationMs: data.durationMs ?? null,
        scrollDepth: data.scrollDepth ?? null,
        metadata: {
          ...(data.metadata ?? {}),
          ...(data.searchTerm ? { searchTerm: data.searchTerm.slice(0, 200) } : {}),
          ...(data.resultCount != null ? { resultCount: data.resultCount } : {}),
        },
        isStaff,
        isDemo: false,
      })
      .onConflictDoNothing()
      .returning({ id: analyticsEvent.id });

    if (inserted.length === 0) return Response.json({ ok: true });

    if (data.type === "pageview") {
      await db
        .insert(analyticsSession)
        .values({
          id: data.sessionId,
          visitorId: data.visitorId,
          pageViews: 1,
          isStaff,
          device,
          country,
          referrerHost: ref.host,
          source: ref.source,
          landingPath: data.path.slice(0, 600),
        })
        .onConflictDoUpdate({
          target: analyticsSession.id,
          set: {
            lastSeenAt: new Date(),
            pageViews: sql`${analyticsSession.pageViews} + 1`,
            isStaff,
          },
        });
    } else {
      await db
        .update(analyticsSession)
        .set({
          lastSeenAt: new Date(),
          ...(data.type === "engagement" && data.durationMs
            ? {
                durationSeconds: sql`greatest(${analyticsSession.durationSeconds}, ${Math.round(
                  data.durationMs / 1000,
                )})`,
              }
            : {}),
        })
        .where(eq(analyticsSession.id, data.sessionId));
    }

    void sqlClient
      .notify("ulmc_analytics_events", JSON.stringify({ type: data.type, path: data.path }))
      .catch(() => {});

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
