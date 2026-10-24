import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { saveFaculty } from "@/server/institutional";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("faculty.manage");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    const result = await saveFaculty(user, null, body as Record<string, unknown>);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
