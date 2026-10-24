import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { article } from "@/server/db/schema";
import { HttpError, errorResponse, readJson } from "@/server/http";
import { clientIp, hashIp } from "@/server/ids";
import { assertMfaCompliant, requireApiUser } from "@/server/session";
import { updateDraft } from "@/server/workflow/service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiUser();
    await assertMfaCompliant(user);
    const body = (await readJson(request)) as {
      revisionId?: unknown;
      expectedVersion?: unknown;
      input?: unknown;
    };
    if (typeof body.revisionId !== "string" || typeof body.expectedVersion !== "number") {
      throw new HttpError(400, "Missing revision or version.");
    }
    const result = await updateDraft(user.id, {
      articleId: id,
      revisionId: body.revisionId,
      expectedVersion: body.expectedVersion,
      input: body.input,
      ipHash: hashIp(clientIp(request.headers)),
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireApiUser();
    const [row] = await db
      .select({ id: article.id, status: article.workflowStatus, updatedAt: article.updatedAt })
      .from(article)
      .where(eq(article.id, id))
      .limit(1);
    if (!row) throw new HttpError(404, "Story not found.");
    return Response.json(row);
  } catch (error) {
    return errorResponse(error);
  }
}
