import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { saveAcademicPage } from "@/server/institutional";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("academics.manage");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    const result = await saveAcademicPage(user, null, body as Record<string, unknown>);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
