"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/studio/rich-text-editor";

type AcademicInitial = {
  id?: string;
  title: string;
  slug: string;
  kind: string;
  summary: string;
  bodyHtml: string;
  linkUrl: string;
  documentId: string | null;
  orderIndex: number;
  isPublished: boolean;
};

export function AcademicForm({
  initial,
  mediaOptions,
}: {
  initial: AcademicInitial;
  mediaOptions: Array<{ id: string; originalName: string | null }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<AcademicInitial>(initial);
  const [bodyHtml, setBodyHtml] = useState(initial.bodyHtml ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof AcademicInitial>(key: K, value: AcademicInitial[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(form.id ? `/api/studio/academics/${form.id}` : "/api/studio/academics", {
        method: form.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, bodyHtml }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Could not save page.");
        setBusy(false);
        return;
      }
      router.push("/studio/academics");
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!form.id) return;
    if (!window.confirm("Delete this academic page?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/academics/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const result = await res.json();
        setError(result.error ?? "Could not delete.");
        setBusy(false);
        return;
      }
      router.push("/studio/academics");
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="acad-title" className="label">Title</label>
          <input id="acad-title" className="field font-serif text-lg" required value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label htmlFor="acad-slug" className="label">Slug</label>
          <input id="acad-slug" className="field" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
        <div>
          <label htmlFor="acad-kind" className="label">Kind</label>
          <input id="acad-kind" className="field" value={form.kind} onChange={(e) => set("kind", e.target.value)} placeholder="program / policy / general" />
        </div>
        <div>
          <label htmlFor="acad-order" className="label">Order</label>
          <input id="acad-order" type="number" className="field" value={form.orderIndex} onChange={(e) => set("orderIndex", Number(e.target.value))} />
        </div>
        <div>
          <label htmlFor="acad-doc" className="label">Document (PDF)</label>
          <select id="acad-doc" className="field" value={form.documentId ?? ""} onChange={(e) => set("documentId", e.target.value || null)}>
            <option value="">None</option>
            {mediaOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.originalName ?? m.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="acad-summary" className="label">Summary</label>
          <textarea id="acad-summary" rows={3} className="field" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="acad-link" className="label">External link</label>
          <input id="acad-link" type="url" className="field" value={form.linkUrl ?? ""} onChange={(e) => set("linkUrl", e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <div>
        <p className="label">Body</p>
        <RichTextEditor initialHtml={initial.bodyHtml ?? ""} onChange={setBodyHtml} label="Academic page body" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} />
        Published
      </label>
      {error ? <p role="alert" className="text-sm text-red-deep">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        {form.id ? (
          <button type="button" onClick={remove} disabled={busy} className="text-xs font-semibold text-red-deep hover:underline">Delete</button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/studio/academics")}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : form.id ? "Save" : "Create"}</button>
        </div>
      </div>
    </form>
  );
}
