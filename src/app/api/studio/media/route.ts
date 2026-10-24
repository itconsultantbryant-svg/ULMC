import { errorResponse } from "@/server/http";
import { assertMfaCompliant, requireApiPermission } from "@/server/session";
import { saveUploadedMedia } from "@/server/media-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiPermission("media.upload");
    await assertMfaCompliant(user);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a file to upload." }, { status: 400 });
    }
    const result = await saveUploadedMedia(user.id, file, {
      alt: String(form.get("alt") ?? ""),
      caption: String(form.get("caption") ?? ""),
      credit: String(form.get("credit") ?? ""),
      rights: String(form.get("rights") ?? ""),
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
