import { createAdvertisement } from "@/server/advertisements";
import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("advertising.manage");
    await assertMfaCompliant(user);
    return Response.json(await createAdvertisement(user, (await readJson(request)) as Record<string, unknown>), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
