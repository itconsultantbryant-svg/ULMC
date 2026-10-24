"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AnnouncementRow = {
  id: string;
  message: string;
  level: string;
  linkLabel: string | null;
  linkUrl: string | null;
  isActive: boolean;
};

const EMPTY = { message: "", level: "info", linkLabel: "", linkUrl: "", isActive: true };

export function AnnouncementsManager({ initial }: { initial: AnnouncementRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function edit(row: AnnouncementRow) {
    setEditingId(row.id);
    setForm({
      message: row.message,
      level: row.level,
      linkLabel: row.linkLabel ?? "",
      linkUrl: row.linkUrl ?? "",
      isActive: row.isActive,
    });
    setError("");
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        editingId ? `/api/studio/announcements/${editingId}` : "/api/studio/announcements",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save the announcement.");
        setBusy(false);
        return;
      }
      reset();
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: AnnouncementRow) {
    setBusy(true);
    try {
      await fetch(`/api/studio/announcements/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...row, isActive: !row.isActive }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AnnouncementRow) {
    if (!window.confirm("Delete this announcement?")) return;
    setBusy(true);
    try {
      await fetch(`/api/studio/announcements/${row.id}`, { method: "DELETE" });
      if (editingId === row.id) reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-white p-5">
        <h3 className="text-base font-semibold">{editingId ? "Edit announcement" : "New announcement"}</h3>
        <div>
          <label htmlFor="ann-message" className="label">Message</label>
          <textarea
            id="ann-message"
            rows={3}
            required
            maxLength={400}
            className="field"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-level" className="label">Level</label>
            <select id="ann-level" className="field" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="info">Information</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label htmlFor="ann-label" className="label">Link label</label>
            <input id="ann-label" className="field" maxLength={60} value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor="ann-url" className="label">Link URL</label>
          <input id="ann-url" className="field" placeholder="/admissions or https://…" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active
        </label>
        {error ? <p role="alert" className="text-sm text-red-deep">{error}</p> : null}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Saving…" : editingId ? "Save" : "Add announcement"}
          </button>
          {editingId ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={busy}>Cancel</button>
          ) : null}
        </div>
      </form>

      <div className="rounded-lg border border-line bg-white">
        <h3 className="border-b border-line px-5 py-3 text-base font-semibold">Announcements</h3>
        {initial.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No announcements.</p>
        ) : (
          <ul className="divide-y divide-line">
            {initial.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{row.message}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                    {row.level} · {row.isActive ? "active" : "inactive"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button type="button" className="font-semibold text-navy hover:text-red" onClick={() => edit(row)} disabled={busy}>
                    Edit
                  </button>
                  <button type="button" className="text-muted hover:text-ink" onClick={() => void toggle(row)} disabled={busy}>
                    {row.isActive ? "Hide" : "Show"}
                  </button>
                  <button type="button" className="text-red-deep hover:underline" onClick={() => void remove(row)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
