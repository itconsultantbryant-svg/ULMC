import { z } from "zod";
import { auditLog } from "@/server/db/schema";
import { db } from "@/server/db/client";
import { errorResponse, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { siteSettingsSchema, updateSiteSettings } from "@/server/settings";

export async function PATCH(request: Request) {
  try {
    const { user } = await requireApiPermission("settings.manage");
    await assertMfaCompliant(user);
    const body = await readJson(request);
    const patch = siteSettingsSchema.partial().parse(body);
    const settings = await updateSiteSettings(user.id, patch);
    await db.insert(auditLog).values({
      actorId: user.id,
      action: "settings.updated",
      entityType: "site_setting",
      entityId: "site",
      metadata: { fields: Object.keys(patch) },
    });
    return Response.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Check the highlighted fields.", code: "validation_error", details: error.flatten() }, { status: 400 });
    }
    return errorResponse(error);
  }
}
