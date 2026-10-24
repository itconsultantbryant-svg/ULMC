"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
};
type TagRow = { id: string; name: string; slug: string };

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: CategoryRow[];
  tags: TagRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState({ name: "", slug: "", kind: "news", description: "", orderIndex: 0, isActive: true });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tag, setTag] = useState({ name: "", slug: "" });
  const [editingTag, setEditingTag] = useState<string | null>(null);

  async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Request failed.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await send(
      editingCategory ? `/api/studio/taxonomy/categories/${editingCategory}` : "/api/studio/taxonomy/categories",
      editingCategory ? "PATCH" : "POST",
      category,
    );
    if (ok) {
      setEditingCategory(null);
      setCategory({ name: "", slug: "", kind: "news", description: "", orderIndex: 0, isActive: true });
    }
  }

  async function saveTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await send(
      editingTag ? `/api/studio/taxonomy/tags/${editingTag}` : "/api/studio/taxonomy/tags",
      editingTag ? "PATCH" : "POST",
      tag,
    );
    if (ok) {
      setEditingTag(null);
      setTag({ name: "", slug: "" });
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">{error}</p> : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={saveCategory} className="space-y-3 rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold">{editingCategory ? "Edit category" : "New category"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cat-name" className="label">Name</label>
              <input id="cat-name" className="field" required value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="cat-slug" className="label">Slug</label>
              <input id="cat-slug" className="field" value={category.slug} placeholder="auto" onChange={(e) => setCategory({ ...category, slug: e.target.value })} />
            </div>
            <div>
              <label htmlFor="cat-kind" className="label">Kind</label>
              <input id="cat-kind" className="field" value={category.kind} onChange={(e) => setCategory({ ...category, kind: e.target.value })} />
            </div>
            <div>
              <label htmlFor="cat-order" className="label">Order</label>
              <input id="cat-order" type="number" className="field" value={category.orderIndex} onChange={(e) => setCategory({ ...category, orderIndex: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label htmlFor="cat-desc" className="label">Description</label>
            <textarea id="cat-desc" rows={2} className="field" value={category.description} onChange={(e) => setCategory({ ...category, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={category.isActive} onChange={(e) => setCategory({ ...category, isActive: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{editingCategory ? "Save" : "Add category"}</button>
            {editingCategory ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditingCategory(null);
                  setCategory({ name: "", slug: "", kind: "news", description: "", orderIndex: 0, isActive: true });
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-lg border border-line bg-white">
          <h2 className="border-b border-line px-5 py-3 text-base font-semibold">Categories</h2>
          {categories.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No categories.</p>
          ) : (
            <ul className="divide-y divide-line">
              {categories.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{row.name}</p>
                    <p className="text-[11px] text-muted">/{row.slug} · {row.kind} · {row.isActive ? "active" : "inactive"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button
                      type="button"
                      className="font-semibold text-navy hover:text-red"
                      onClick={() => {
                        setEditingCategory(row.id);
                        setCategory({ name: row.name, slug: row.slug, kind: row.kind, description: row.description ?? "", orderIndex: row.orderIndex, isActive: row.isActive });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-deep hover:underline"
                      onClick={() => {
                        if (window.confirm(`Delete category “${row.name}”? Articles keep their content but lose this category.`)) {
                          void send(`/api/studio/taxonomy/categories/${row.id}`, "DELETE");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={saveTag} className="space-y-3 rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold">{editingTag ? "Edit tag" : "New tag"}</h2>
          <div>
            <label htmlFor="tag-name" className="label">Name</label>
            <input id="tag-name" className="field" required value={tag.name} onChange={(e) => setTag({ ...tag, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="tag-slug" className="label">Slug</label>
            <input id="tag-slug" className="field" value={tag.slug} placeholder="auto" onChange={(e) => setTag({ ...tag, slug: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{editingTag ? "Save" : "Add tag"}</button>
            {editingTag ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditingTag(null); setTag({ name: "", slug: "" }); }}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-lg border border-line bg-white">
          <h2 className="border-b border-line px-5 py-3 text-base font-semibold">Tags</h2>
          {tags.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No tags.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 p-5">
              {tags.map((row) => (
                <li key={row.id} className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs">
                  <button type="button" className="font-semibold text-ink hover:text-red" onClick={() => { setEditingTag(row.id); setTag({ name: row.name, slug: row.slug }); }}>
                    {row.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${row.name}`}
                    className="text-muted hover:text-red-deep"
                    onClick={() => {
                      if (window.confirm(`Delete tag “${row.name}”?`)) void send(`/api/studio/taxonomy/tags/${row.id}`, "DELETE");
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
