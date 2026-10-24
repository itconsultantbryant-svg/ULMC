"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FacultyInitial = {
  id?: string;
  name: string;
  slug: string;
  role: string;
  photoId: string | null;
  bio: string;
  qualifications: string;
  teachingInterests: string;
  researchInterests: string;
  email: string;
  phone: string;
  office: string;
  orderIndex: number;
  isActive: boolean;
};

export function FacultyForm({
  initial,
  mediaOptions,
}: {
  initial: FacultyInitial;
  mediaOptions: Array<{ id: string; originalName: string | null; alt: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FacultyInitial>(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FacultyInitial>(key: K, value: FacultyInitial[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(form.id ? `/api/studio/faculty/${form.id}` : "/api/studio/faculty", {
        method: form.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Could not save profile.");
        setBusy(false);
        return;
      }
      router.push("/studio/faculty");
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!form.id) return;
    if (!window.confirm("Remove this faculty profile?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/faculty/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const result = await res.json();
        setError(result.error ?? "Could not delete.");
        setBusy(false);
        return;
      }
      router.push("/studio/faculty");
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="faculty-name" className="label">Name</label>
          <input id="faculty-name" className="field" required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-role" className="label">Role / title</label>
          <input id="faculty-role" className="field" required value={form.role} onChange={(e) => set("role", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-slug" className="label">Slug</label>
          <input id="faculty-slug" className="field" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-photo" className="label">Photo</label>
          <select id="faculty-photo" className="field" value={form.photoId ?? ""} onChange={(e) => set("photoId", e.target.value || null)}>
            <option value="">No photo</option>
            {mediaOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.originalName ?? m.alt ?? m.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="faculty-email" className="label">Email</label>
          <input id="faculty-email" type="email" className="field" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-phone" className="label">Phone</label>
          <input id="faculty-phone" className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-office" className="label">Office</label>
          <input id="faculty-office" className="field" value={form.office} onChange={(e) => set("office", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-order" className="label">Order</label>
          <input id="faculty-order" type="number" className="field" value={form.orderIndex} onChange={(e) => set("orderIndex", Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="faculty-bio" className="label">Bio</label>
          <textarea id="faculty-bio" rows={6} className="field" value={form.bio} onChange={(e) => set("bio", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-qual" className="label">Qualifications</label>
          <textarea id="faculty-qual" rows={3} className="field" value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)} />
        </div>
        <div>
          <label htmlFor="faculty-teach" className="label">Teaching interests</label>
          <textarea id="faculty-teach" rows={3} className="field" value={form.teachingInterests} onChange={(e) => set("teachingInterests", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="faculty-research" className="label">Research interests</label>
          <textarea id="faculty-research" rows={3} className="field" value={form.researchInterests} onChange={(e) => set("researchInterests", e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        Active (shown on public faculty page)
      </label>
      {error ? <p role="alert" className="text-sm text-red-deep">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        {form.id ? (
          <button type="button" onClick={remove} disabled={busy} className="text-xs font-semibold text-red-deep hover:underline">
            Delete profile
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/studio/faculty")}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : form.id ? "Save" : "Create profile"}</button>
        </div>
      </div>
    </form>
  );
}
