import { z } from "zod";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { unsubscribeNewsletter } from "@/server/newsletter";
import { clientIp } from "@/server/ids";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";

const schema = z.object({
  id: z.string().uuid(),
  sig: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const limited = rateLimit(`newsletter-unsubscribe:${ip ?? "unknown"}`, 20, 10 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "This unsubscribe link is invalid.");
    const ok = await unsubscribeNewsletter(parsed.data.id, parsed.data.sig);
    if (!ok) throw new HttpError(400, "This unsubscribe link is invalid.");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
