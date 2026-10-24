"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function textToHtml(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function NewStoryForm({
  categories,
  contentTypes,
  defaultAuthor,
}: {
  categories: { id: string; name: string }[];
  contentTypes: { value: string; label: string }[];
  defaultAuthor: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [contentType, setContentType] = useState("news");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/studio/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          bodyHtml: textToHtml(body),
          categoryId,
          contentType,
        }),
      });
      const payload = (await response.json()) as { articleId?: string; error?: string };
      if (!response.ok || !payload.articleId) {
        setError(payload.error ?? "We could not create the story.");
        setSubmitting(false);
        return;
      }
      router.push(`/studio/articles/${payload.articleId}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-line bg-white p-5 sm:p-6">
      <div>
        <label htmlFor="title" className="label">
          Headline
        </label>
        <input
          id="title"
          required
          minLength={3}
          maxLength={180}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="field text-lg font-semibold"
          placeholder="A clear, specific headline"
        />
      </div>

      <div>
        <label htmlFor="summary" className="label">
          Summary / standfirst
        </label>
        <textarea
          id="summary"
          required
          minLength={10}
          maxLength={600}
          rows={3}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="field"
          placeholder="One or two sentences that explain what the story reports and why it matters."
        />
        <p className="mt-1 text-xs text-muted">{summary.length}/600 characters</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="label">
            Category
          </label>
          <select
            id="category"
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="field"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contentType" className="label">
            Story type
          </label>
          <select
            id="contentType"
            value={contentType}
            onChange={(event) => setContentType(event.target.value)}
            className="field"
          >
            {contentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="body" className="label">
          Opening text
        </label>
        <textarea
          id="body"
          required
          minLength={20}
          rows={7}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="field font-serif text-base leading-relaxed"
          placeholder="Write or paste the opening of the story. You can continue in the full editor."
        />
        <p className="mt-1 text-xs text-muted">
          At least 20 characters. Formatting is refined in the editor.
        </p>
      </div>

      <div className="rounded border border-line bg-mist px-3 py-2 text-xs text-muted">
        Byline: <strong className="text-ink">{defaultAuthor}</strong>. Additional authors can be added
        in the editor.
      </div>

      {error ? (
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-muted">Stories are private drafts until submitted for review.</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create draft and open editor"}
          </button>
        </div>
      </div>
    </form>
  );
}
