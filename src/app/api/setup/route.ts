import { errorResponse, readJson } from "@/server/http";
import { createFirstSuperAdmin } from "@/server/setup";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`setup:${ip}`, 5, 300_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);
    const body = (await readJson(request)) as Record<string, unknown>;
    const result = await createFirstSuperAdmin({
      token: String(body.token ?? ""),
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });
    return Response.json({ ok: true, id: result.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
