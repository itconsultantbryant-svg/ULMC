import { errorResponse, readJson } from "@/server/http";
import { acceptInvitation } from "@/server/users";

export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { token?: unknown; name?: unknown; password?: unknown };
    if (typeof body.token !== "string" || typeof body.name !== "string" || typeof body.password !== "string") {
      return Response.json({ error: "Complete all fields." }, { status: 400 });
    }
    const result = await acceptInvitation({ token: body.token, name: body.name, password: body.password });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
