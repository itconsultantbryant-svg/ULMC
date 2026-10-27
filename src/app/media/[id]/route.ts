import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getAuthContext } from "@/server/session";
import { getMediaById, isMediaPublic, isSafeStorageKey } from "@/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(name: string, download: boolean): string {
  const safe = name.replace(/["\\\r\n]/g, "_").slice(0, 180);
  const encoded = encodeURIComponent(name);
  return `${download ? "attachment" : "inline"}; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await getMediaById(id);
  if (!asset) return new Response("Not found", { status: 404 });

  const publiclyVisible = await isMediaPublic(id);
  if (!publiclyVisible) {
    const context = await getAuthContext();
    if (!context) return new Response("Not found", { status: 404 });
  }

  if (asset.storageDriver === "static") {
    if (!/^[a-z0-9][a-z0-9-]*\.(?:png|jpe?g|webp|avif)$/i.test(asset.storageKey)) {
      return new Response("Invalid media key", { status: 500 });
    }
    return Response.redirect(new URL(`/news-images/${asset.storageKey}`, request.url), 307);
  }
  if (asset.storageDriver !== "local") {
    return new Response("Storage driver not configured", { status: 501 });
  }
  if (!isSafeStorageKey(asset.storageKey)) {
    return new Response("Invalid media key", { status: 500 });
  }

  const filePath = path.join(process.cwd(), ".data", "media", asset.storageKey);
  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(filePath);
  } catch {
    return new Response("Media file missing", { status: 404 });
  }
  if (!fileStat.isFile()) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  const etag = `"${asset.checksum ?? `${fileStat.size}-${fileStat.mtimeMs}`}"`;
  const headers = new Headers({
    "content-type": asset.mimeType || "application/octet-stream",
    "content-disposition": contentDisposition(asset.originalName ?? asset.storageKey, download),
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "accept-ranges": "bytes",
    etag,
    "last-modified": fileStat.mtime.toUTCString(),
    "cache-control": publiclyVisible
      ? "public, max-age=31536000, immutable"
      : "private, no-store",
  });

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      let start = match[1] ? Number.parseInt(match[1], 10) : 0;
      let end = match[2] ? Number.parseInt(match[2], 10) : fileStat.size - 1;
      if (!match[1] && match[2]) {
        start = Math.max(0, fileStat.size - Number.parseInt(match[2], 10));
        end = fileStat.size - 1;
      }
      if (start >= fileStat.size || start > end) {
        return new Response(null, {
          status: 416,
          headers: { "content-range": `bytes */${fileStat.size}` },
        });
      }
      end = Math.min(end, fileStat.size - 1);
      headers.set("content-range", `bytes ${start}-${end}/${fileStat.size}`);
      headers.set("content-length", String(end - start + 1));
      const stream = createReadStream(filePath, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
    }
  }

  headers.set("content-length", String(fileStat.size));
  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: 200, headers });
}
