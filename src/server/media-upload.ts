import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/server/db/client";
import { mediaAsset } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { env } from "@/lib/env";
import { assertS3Configured, s3Client } from "@/server/media";

const MEDIA_DIR = path.join(process.cwd(), ".data", "media");
const MAX_BYTES = 25 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export async function saveUploadedMedia(
  actorId: string,
  file: File,
  fields: { alt?: string; caption?: string; credit?: string; rights?: string } = {},
): Promise<{ id: string; storageKey: string }> {
  if (env.storageDriver === "s3") {
    try {
      assertS3Configured();
    } catch (error) {
      throw new HttpError(503, error instanceof Error ? error.message : "S3 media storage is not configured.");
    }
  }
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new HttpError(400, "Choose a file to upload.");
  }
  if (file.size <= 0) throw new HttpError(400, "The uploaded file is empty.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Files must be 25 MB or smaller.");

  const ext = EXTENSIONS[file.type];
  if (!ext) {
    throw new HttpError(415, "Unsupported file type. Upload images, PDFs, audio or MP4/WebM video.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = `${randomUUID()}.${ext}`;
  const checksum = createHash("sha256").update(buffer).digest("hex");

  let width: number | null = null;
  let height: number | null = null;
  let blurDataUrl: string | null = null;
  if (file.type.startsWith("image/")) {
    try {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
      if (width && height) {
        const preview = await sharp(buffer)
          .resize({ width: 24, height: 24, fit: "inside" })
          .blur(8)
          .webp({ quality: 40 })
          .toBuffer();
        blurDataUrl = `data:image/webp;base64,${preview.toString("base64")}`;
      }
    } catch {
      throw new HttpError(415, "That image could not be processed. Try a different file.");
    }
  }

  if (env.storageDriver === "s3") {
    try {
      await s3Client().send(new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "private, max-age=0",
      }));
    } catch (error) {
      console.error("S3 media upload failed", error);
      throw new HttpError(502, "The media storage service could not save this file. Please try again.");
    }
  } else {
    await mkdir(MEDIA_DIR, { recursive: true });
    await writeFile(path.join(MEDIA_DIR, storageKey), buffer, { flag: "wx" });
  }

  const originalName = (file.name || `upload.${ext}`)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 200);

  const [row] = await db
    .insert(mediaAsset)
    .values({
      storageDriver: env.storageDriver,
      storageKey,
      originalName,
      mimeType: file.type,
      sizeBytes: file.size,
      width,
      height,
      checksum,
      alt: (fields.alt ?? "").trim().slice(0, 300),
      caption: fields.caption?.trim() || null,
      credit: fields.credit?.trim() || null,
      rights: fields.rights?.trim() || null,
      blurDataUrl,
      isPrivate: true,
      uploadedBy: actorId,
    })
    .returning({ id: mediaAsset.id, storageKey: mediaAsset.storageKey });

  if (!row) throw new HttpError(500, "Could not record the uploaded file.");
  return row;
}
