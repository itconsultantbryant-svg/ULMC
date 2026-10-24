import { z } from "zod";
import { env } from "@/lib/env";
import { invalidatePublicContent, invalidateSettingsCache } from "@/server/cache";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { safeEqual } from "@/server/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  paths: z.array(z.string().max(300)).max(50).optional(),
  settings: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const secret = env.cronSecret;
    const provided = request.headers.get("x-internal-secret") ?? "";
    if (!secret || !safeEqual(secret, provided)) {
      throw new HttpError(401, "Unauthorized.");
    }
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Invalid payload.");
    if (parsed.data.settings) await invalidateSettingsCache();
    await invalidatePublicContent(parsed.data.paths ?? []);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
