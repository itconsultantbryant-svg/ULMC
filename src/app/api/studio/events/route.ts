import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { createEvent } from "@/server/events";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("events.manage");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    const result = await createEvent(user, body as Record<string, unknown>);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
