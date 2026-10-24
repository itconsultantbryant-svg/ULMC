import { HttpError, errorResponse, readJson } from "@/server/http";
import { clientIp, hashIp } from "@/server/ids";
import { assertMfaCompliant, requireApiUser } from "@/server/session";
import {
  adminDecision,
  archiveArticle,
  assignEditor,
  cancelSchedule,
  editorialApprove,
  publishNow,
  rejectArticle,
  requestChanges,
  schedulePublication,
  startReplacementDraft,
  startEditorialReview,
  submitForReview,
  unpublish,
} from "@/server/workflow/service";

type Body = Record<string, unknown> & { action?: unknown };

function str(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `Missing ${field}.`);
  return value;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiUser();
    await assertMfaCompliant(user);
    const body = (await readJson(request)) as Body;
    const action = str(body.action, "action");
    const ipHash = hashIp(clientIp(request.headers));
    const revisionId = typeof body.revisionId === "string" ? body.revisionId : undefined;
    const expectedVersion = typeof body.expectedVersion === "number" ? body.expectedVersion : undefined;

    switch (action) {
      case "submit": {
        if (!revisionId || expectedVersion === undefined) throw new HttpError(400, "Missing revision.");
        return Response.json(
          await submitForReview(user.id, { articleId: id, revisionId, expectedVersion, ipHash }),
        );
      }
      case "replacement_draft": {
        return Response.json(await startReplacementDraft(user.id, id, ipHash));
      }
      case "claim_review": {
        if (!revisionId) throw new HttpError(400, "Missing revision.");
        return Response.json(await startEditorialReview(user.id, { articleId: id, revisionId, ipHash }));
      }
      case "request_changes": {
        if (!revisionId) throw new HttpError(400, "Missing revision.");
        await requestChanges(user.id, {
          articleId: id,
          revisionId,
          reason: str(body.reason, "reason"),
          checklist: typeof body.checklist === "object" && body.checklist ? (body.checklist as Record<string, boolean>) : undefined,
          ipHash,
        });
        return Response.json({ ok: true });
      }
      case "editorial_approve": {
        if (!revisionId) throw new HttpError(400, "Missing revision.");
        return Response.json(
          await editorialApprove(user.id, {
            articleId: id,
            revisionId,
            checklist: body.checklist,
            note: typeof body.note === "string" ? body.note : undefined,
            ipHash,
          }),
        );
      }
      case "editorial_reject": {
        if (!revisionId) throw new HttpError(400, "Missing revision.");
        await rejectArticle(user.id, {
          articleId: id,
          revisionId,
          reason: str(body.reason, "reason"),
          ipHash,
        });
        return Response.json({ ok: true });
      }
      case "admin_approve":
      case "admin_return":
      case "admin_reject": {
        if (!revisionId) throw new HttpError(400, "Missing revision.");
        const decision = action === "admin_approve" ? "approve" : action === "admin_return" ? "return" : "reject";
        return Response.json(
          await adminDecision(user.id, {
            articleId: id,
            revisionId,
            decision,
            reason: typeof body.reason === "string" ? body.reason : undefined,
            ipHash,
          }),
        );
      }
      case "publish": {
        if (!revisionId) throw new HttpError(400, "Missing revision.");
        return Response.json(await publishNow(user.id, { articleId: id, revisionId, ipHash }));
      }
      case "schedule": {
        if (!revisionId) throw new HttpError(400, "Missing revision.");
        const when = new Date(str(body.scheduledFor, "scheduledFor"));
        if (Number.isNaN(when.getTime())) throw new HttpError(400, "Choose a valid schedule time.");
        return Response.json(
          await schedulePublication(user.id, { articleId: id, revisionId, scheduledFor: when, ipHash }),
        );
      }
      case "cancel_schedule": {
        await cancelSchedule(user.id, { articleId: id, reason: typeof body.reason === "string" ? body.reason : undefined, ipHash });
        return Response.json({ ok: true });
      }
      case "unpublish": {
        return Response.json(await unpublish(user.id, { articleId: id, reason: str(body.reason, "reason"), ipHash }));
      }
      case "archive": {
        await archiveArticle(user.id, { articleId: id, reason: typeof body.reason === "string" ? body.reason : undefined, ipHash });
        return Response.json({ ok: true });
      }
      case "assign_editor": {
        await assignEditor(user.id, { articleId: id, editorId: str(body.editorId, "editorId") });
        return Response.json({ ok: true });
      }
      default:
        throw new HttpError(400, "Unknown action.");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
