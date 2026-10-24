import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { saveAnnouncement } from "@/server/content-admin";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("institutional.manage");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    const result = await saveAnnouncement(user, null, body as Record<string, unknown>);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
