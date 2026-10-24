import { z } from "zod";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { clientIp, hashIp, isLikelyBot } from "@/server/ids";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";
import { subscribeToNewsletter } from "@/server/newsletter";
import { readSiteSettings } from "@/server/settings";

const schema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().max(120).optional().default(""),
  company: z.string().max(200).optional().default(""),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    if (isLikelyBot(request.headers.get("user-agent"))) {
      return Response.json({ ok: true, message: "Check your inbox to confirm your subscription." });
    }
    const limited = rateLimit(`newsletter:${ip ?? "unknown"}`, 5, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const settings = await readSiteSettings();
    if (!settings.newsletterEnabled) {
      throw new HttpError(403, "Newsletter subscriptions are currently closed.");
    }

    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(400, "Please enter a valid email address and accept the privacy notice.");
    }
    if (parsed.data.company) {
      return Response.json({ ok: true, message: "Check your inbox to confirm your subscription." });
    }

    await subscribeToNewsletter(parsed.data.email, hashIp(ip));
    return Response.json({
      ok: true,
      message: "Check your inbox to confirm your subscription.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
