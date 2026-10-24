import { env } from "@/lib/env";
import { safeEqual } from "@/server/ids";
import { runWorkerOnce } from "@/worker/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorised(request: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return false;
  const internalSecret = request.headers.get("x-internal-secret") ?? "";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return safeEqual(secret, internalSecret) || safeEqual(secret, bearer);
}

// Vercel Cron calls this route with Authorization: Bearer $CRON_SECRET.
// The database job lock makes concurrent invocations safe.
export async function GET(request: Request) {
  if (!isAuthorised(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runWorkerOnce();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Scheduled worker tick failed", error);
    return Response.json({ error: "Worker tick failed" }, { status: 500 });
  }
}
