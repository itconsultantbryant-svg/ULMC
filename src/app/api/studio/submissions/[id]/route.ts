import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { contactMessage } from "@/server/db/schema";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";

const schema = z.object({ status: z.enum(["new", "reviewed", "closed"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireApiPermission("submissions.manage");
    await assertMfaCompliant(user);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Choose a valid review status.");
    const { id } = await context.params;
    const updated = await db
      .update(contactMessage)
      .set({ status: parsed.data.status })
      .where(eq(contactMessage.id, id))
      .returning({ id: contactMessage.id, status: contactMessage.status });
    if (updated.length === 0) throw new HttpError(404, "Submission not found.");
    return Response.json(updated[0]);
  } catch (error) {
    return errorResponse(error);
  }
}
