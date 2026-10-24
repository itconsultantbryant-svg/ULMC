import { HttpError, errorResponse, readJson } from "@/server/http";
import { clientIp, hashIp } from "@/server/ids";
import { requireApiPermission, assertMfaCompliant } from "@/server/session";
import { createArticle } from "@/server/workflow/service";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("article.create");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    if (!body || typeof body !== "object") throw new HttpError(400, "Expected an article payload.");
    const result = await createArticle(user.id, body);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
