import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { saveTeamMember } from "@/server/content-admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireApiPermission("institutional.manage");
    await assertMfaCompliant(user);
    const { id } = await context.params;
    return Response.json(await saveTeamMember(user, id, (await readJson(request)) as Record<string, unknown>));
  } catch (error) {
    return errorResponse(error);
  }
}
