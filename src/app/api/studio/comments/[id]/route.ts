import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { moderateComment, type ModerationAction } from "@/server/comments";

const ACTIONS: ModerationAction[] = ["approve", "reject", "spam", "delete"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiPermission("comments.moderate");
    await assertMfaCompliant(user);
    const body = (await readJson(request)) as { action?: unknown; reason?: unknown };
    const action = String(body.action ?? "") as ModerationAction;
    if (!ACTIONS.includes(action)) return Response.json({ error: "Unknown action." }, { status: 400 });
    const result = await moderateComment(user, {
      commentId: id,
      action,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
