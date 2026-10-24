import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { deleteEvent, updateEvent } from "@/server/events";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiPermission("events.manage");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    await updateEvent(user, id, body as Record<string, unknown>);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiPermission("events.manage");
    await assertMfaCompliant(user);
    await deleteEvent(user, id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
