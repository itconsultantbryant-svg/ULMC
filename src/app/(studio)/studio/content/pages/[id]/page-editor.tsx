"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/studio/rich-text-editor";

export function PageEditor({
  id,
  slug,
  initial,
}: {
  id: string;
  slug: string;
  initial: { title: string; bodyHtml: string; section: string; orderIndex: number; isPublished: boolean };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [section, setSection] = useState(initial.section);
  const [orderIndex, setOrderIndex] = useState(initial.orderIndex);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [bodyHtml, setBodyHtml] = useState(initial.bodyHtml);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/studio/content/pages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, section, orderIndex, isPublished, bodyHtml }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save the page.");
        setBusy(false);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label htmlFor="page-title" className="label">Title</label>
          <input id="page-title" className="field font-serif text-lg" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <p className="mt-1 text-xs text-muted">Public URL: /pages/{slug}</p>
        </div>
        <div>
          <label htmlFor="page-section" className="label">Section</label>
          <input id="page-section" className="field" value={section} onChange={(e) => setSection(e.target.value)} />
        </div>
        <div>
          <label htmlFor="page-order" className="label">Order</label>
          <input id="page-order" type="number" className="field" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <p className="label">Body</p>
        <p className="mb-1 text-xs text-muted">Use the image or video toolbar button after uploading media in the Media library. Published updates appear immediately.</p>
        <RichTextEditor initialHtml={initial.bodyHtml} onChange={setBodyHtml} label="Page body" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        Published
      </label>
      {error ? <p role="alert" className="text-sm text-red-deep">{error}</p> : null}
      {saved ? <p role="status" className="text-sm text-success">Page saved.</p> : null}
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save page"}</button>
      </div>
    </form>
  );
}
