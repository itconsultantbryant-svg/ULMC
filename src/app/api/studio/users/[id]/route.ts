import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiUser } from "@/server/session";
import { resetUserMfa, updateUserByAdmin } from "@/server/users";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiUser();
    await assertMfaCompliant(user);
    const body = (await readJson(request)) as Record<string, unknown>;
    if (body.action === "mfa_reset") {
      await resetUserMfa(user, id);
      return Response.json({ ok: true });
    }
    await updateUserByAdmin(user, id, {
      role: typeof body.role === "string" ? body.role : undefined,
      banned: typeof body.banned === "boolean" ? body.banned : undefined,
      banReason: typeof body.banReason === "string" ? body.banReason : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      bio: typeof body.bio === "string" ? body.bio : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
