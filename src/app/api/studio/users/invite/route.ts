import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { createInvitation } from "@/server/users";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("users.invite");
    await assertMfaCompliant(user);
    const body = (await readJson(request)) as { email?: unknown; name?: unknown; role?: unknown };
    if (typeof body.email !== "string") return Response.json({ error: "Enter an email address." }, { status: 400 });
    const result = await createInvitation(user, {
      email: body.email,
      name: typeof body.name === "string" ? body.name : undefined,
      role: typeof body.role === "string" ? body.role : "staff",
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
