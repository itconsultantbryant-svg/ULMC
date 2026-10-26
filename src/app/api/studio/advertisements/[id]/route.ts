import { deleteAdvertisement, updateAdvertisement } from "@/server/advertisements";
import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireApiPermission("advertising.manage");
    await assertMfaCompliant(user);
    await updateAdvertisement(user, (await context.params).id, (await readJson(request)) as Record<string, unknown>);
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireApiPermission("advertising.manage");
    await assertMfaCompliant(user);
    await deleteAdvertisement(user, (await context.params).id);
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
