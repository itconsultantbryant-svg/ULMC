"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

export function MediaUploader() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/studio/media", { method: "POST", body: form });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Upload failed.");
        setBusy(false);
        return;
      }
      setMessage("File uploaded. Add alt text and credit before using it as a featured image.");
      formRef.current?.reset();
      router.refresh();
    } catch {
      setError("Network error during upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-white p-5">
      <h2 className="text-lg">Upload media</h2>
      <p className="text-xs text-muted">
        Images, PDFs, audio and MP4/WebM video up to 25 MB. Uploads are private until used in a
        published story.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="file" className="label">
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm"
            className="field py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        <div>
          <label htmlFor="alt" className="label">
            Alt text
          </label>
          <input id="alt" name="alt" maxLength={300} className="field" placeholder="Describe the image for screen readers" />
        </div>
        <div>
          <label htmlFor="credit" className="label">
            Credit
          </label>
          <input id="credit" name="credit" maxLength={200} className="field" placeholder="Photographer or source" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="caption" className="label">
            Caption
          </label>
          <input id="caption" name="caption" maxLength={400} className="field" />
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm font-semibold text-success">{message}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        <Upload className="h-4 w-4" aria-hidden />
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
