"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ad = { id: string; title: string; body: string; mediaId: string | null; destinationUrl: string | null; startsAt: Date | null; endsAt: Date | null; isActive: boolean; orderIndex: number };
type Media = { id: string; originalName: string | null; mimeType: string };
const blank = { title: "", body: "", mediaId: "", destinationUrl: "", startsAt: "", endsAt: "", isActive: true, orderIndex: 0 };
const local = (value: Date | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

export function AdvertisingManager({ ads, media }: { ads: Ad[]; media: Media[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof blank, value: string | boolean | number) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => { setForm(blank); setEditing(null); setError(""); };
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(editing ? `/api/studio/advertisements/${editing}` : "/api/studio/advertisements", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, mediaId: form.mediaId || null, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not save the advertisement."); return; }
      reset(); router.refresh();
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this advertisement permanently?")) return;
    setBusy(true); const response = await fetch(`/api/studio/advertisements/${id}`, { method: "DELETE" }); setBusy(false);
    if (!response.ok) { setError("Could not delete the advertisement."); return; } if (editing === id) reset(); router.refresh();
  }
  function edit(ad: Ad) { setEditing(ad.id); setForm({ title: ad.title, body: ad.body, mediaId: ad.mediaId ?? "", destinationUrl: ad.destinationUrl ?? "", startsAt: local(ad.startsAt), endsAt: local(ad.endsAt), isActive: ad.isActive, orderIndex: ad.orderIndex }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <div className="space-y-6">
    <form onSubmit={save} className="space-y-4 rounded-lg border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg">{editing ? "Edit advertisement" : "New advertisement"}</h2>{editing ? <button type="button" onClick={reset} className="text-xs font-semibold text-navy hover:underline">Cancel edit</button> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="label">Title</span><input required minLength={2} maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} className="field" /></label><label className="sm:col-span-2"><span className="label">Image or video</span><select value={form.mediaId} onChange={(e) => set("mediaId", e.target.value)} className="field"><option value="">No media</option>{media.filter((item) => item.mimeType.startsWith("image/") || item.mimeType.startsWith("video/")).map((item) => <option key={item.id} value={item.id}>{item.originalName ?? item.id} · {item.mimeType}</option>)}</select><span className="mt-1 block text-xs text-muted">Upload media in the Media library first. Active ad media becomes publicly visible automatically.</span></label><label><span className="label">Destination URL</span><input type="url" value={form.destinationUrl} onChange={(e) => set("destinationUrl", e.target.value)} placeholder="https://…" className="field" /></label><label><span className="label">Display order</span><input type="number" min="0" max="999" value={form.orderIndex} onChange={(e) => set("orderIndex", Number(e.target.value))} className="field" /></label><label><span className="label">Start date (optional)</span><input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className="field" /></label><label><span className="label">End date (optional)</span><input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className="field" /></label><label className="sm:col-span-2"><span className="label">Details</span><textarea rows={3} maxLength={600} value={form.body} onChange={(e) => set("body", e.target.value)} className="field" /></label></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Show this advertisement on the website</label>
      {error ? <p role="alert" className="text-sm text-red-deep">{error}</p> : null}<button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : editing ? "Save changes" : "Create advertisement"}</button>
    </form>
    <div className="overflow-x-auto rounded-lg border border-line bg-white"><table className="table-clean"><thead><tr><th>Advertisement</th><th>Status</th><th>Schedule</th><th /></tr></thead><tbody>{ads.map((ad) => <tr key={ad.id}><td><strong>{ad.title}</strong><p className="text-xs text-muted">{ad.mediaId ? "Media attached" : "Text only"}</p></td><td className={ad.isActive ? "text-success" : "text-muted"}>{ad.isActive ? "Active" : "Inactive"}</td><td className="text-xs text-muted">{ad.startsAt ? new Date(ad.startsAt).toLocaleDateString() : "Now"} — {ad.endsAt ? new Date(ad.endsAt).toLocaleDateString() : "No end"}</td><td className="whitespace-nowrap text-right"><button onClick={() => edit(ad)} className="mr-3 text-xs font-semibold text-navy hover:underline">Edit</button><button onClick={() => remove(ad.id)} className="text-xs font-semibold text-red-deep hover:underline">Delete</button></td></tr>)}</tbody></table>{ads.length === 0 ? <p className="p-6 text-center text-sm text-muted">No advertisements yet.</p> : null}</div>
  </div>;
}
