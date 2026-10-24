import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mediaAsset } from "@/server/db/schema";
import { HttpError, errorResponse, readJson } from "@/server/http";
import { can } from "@/server/permissions";
import { assertMfaCompliant, requireApiUser } from "@/server/session";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireApiUser();
    await assertMfaCompliant(user);
    const body = (await readJson(request)) as Record<string, unknown>;
    const [asset] = await db.select().from(mediaAsset).where(eq(mediaAsset.id, id)).limit(1);
    if (!asset) throw new HttpError(404, "Media not found.");
    if (asset.uploadedBy !== user.id && !can(user, "media.manageAll")) {
      throw new HttpError(403, "You can only edit your own uploads.");
    }
    const patch: Partial<typeof mediaAsset.$inferInsert> = {};
    if (typeof body.alt === "string") patch.alt = body.alt.trim().slice(0, 300);
    if (typeof body.caption === "string") patch.caption = body.caption.trim() || null;
    if (typeof body.credit === "string") patch.credit = body.credit.trim() || null;
    if (typeof body.rights === "string") patch.rights = body.rights.trim() || null;
    if (typeof body.isPrivate === "boolean") patch.isPrivate = body.isPrivate;
    if (Object.keys(patch).length === 0) throw new HttpError(400, "No changes supplied.");
    await db.update(mediaAsset).set(patch).where(eq(mediaAsset.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
