import { z } from "zod";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { confirmNewsletterToken } from "@/server/newsletter";
import { clientIp } from "@/server/ids";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";

const schema = z.object({ token: z.string().min(20).max(200) });

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const limited = rateLimit(`newsletter-confirm:${ip ?? "unknown"}`, 20, 10 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "This confirmation link is invalid.");
    const ok = await confirmNewsletterToken(parsed.data.token);
    if (!ok) {
      throw new HttpError(400, "This confirmation link is invalid or has already been used.");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
