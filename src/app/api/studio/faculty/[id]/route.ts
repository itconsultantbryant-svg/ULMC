import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { deleteFaculty, saveFaculty } from "@/server/institutional";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiPermission("faculty.manage");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    await saveFaculty(user, id, body as Record<string, unknown>);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiPermission("faculty.manage");
    await assertMfaCompliant(user);
    await deleteFaculty(user, id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
