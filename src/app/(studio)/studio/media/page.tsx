import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import { can } from "@/server/permissions";
import { requirePagePermission } from "@/server/session";
import { listMediaAssets } from "@/server/studio/queries";
import { MediaMetaForm } from "./media-meta-form";
import { MediaUploader } from "./media-uploader";

export const metadata: Metadata = {
  title: "Media library",
  robots: { index: false, follow: false },
};

export default async function MediaPage() {
  const { user } = await requirePagePermission("media.upload", "/studio/media");
  const assets = await listMediaAssets(user, 120);
  const canManageAll = can(user, "media.manageAll");

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Assets</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Media library</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Upload images and documents for stories. Every asset needs descriptive alt text and a credit
          before it can be used as a featured image.
        </p>
      </header>

      <MediaUploader />

      {assets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-white px-5 py-10 text-center text-sm text-muted">
          No media uploaded yet. Files you upload will appear here.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const isImage = asset.mimeType.startsWith("image/");
            const canEdit = canManageAll || asset.uploadedBy === user.id;
            return (
              <li key={asset.id} className="overflow-hidden rounded-lg border border-line bg-white">
                <div className="aspect-[4/3] bg-mist">
                  {isImage ? (
                    <img
                      src={`/media/${asset.id}`}
                      alt={asset.alt || asset.originalName || "Media asset"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <FileText className="h-10 w-10" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-semibold text-ink">
                    {asset.originalName ?? asset.id.slice(0, 8)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {asset.mimeType} · {formatBytes(asset.sizeBytes)}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(asset.createdAt)} ·{" "}
                    <span className={asset.isPrivate ? "text-warning" : "text-success"}>
                      {asset.isPrivate ? "private" : "public"}
                    </span>
                  </p>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-navy hover:text-red">
                      Details and metadata
                    </summary>
                    <MediaMetaForm
                      id={asset.id}
                      alt={asset.alt}
                      caption={asset.caption}
                      credit={asset.credit}
                      isPrivate={asset.isPrivate}
                      canEdit={canEdit}
                    />
                    <a
                      href={`/media/${asset.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-navy underline"
                    >
                      Open file
                    </a>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
