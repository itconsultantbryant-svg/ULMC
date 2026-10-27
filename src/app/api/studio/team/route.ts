import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { saveTeamMember } from "@/server/content-admin";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("institutional.manage");
    await assertMfaCompliant(user);
    return Response.json(await saveTeamMember(user, null, (await readJson(request)) as Record<string, unknown>), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
