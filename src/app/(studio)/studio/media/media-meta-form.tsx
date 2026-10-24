"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MediaMetaForm({
  id,
  alt,
  caption,
  credit,
  isPrivate,
  canEdit,
}: {
  id: string;
  alt: string;
  caption: string | null;
  credit: string | null;
  isPrivate: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ alt, caption: caption ?? "", credit: credit ?? "", isPrivate });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/studio/media/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save.");
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

  if (!canEdit) {
    return (
      <dl className="mt-3 space-y-1 text-xs">
        <div>
          <dt className="inline font-semibold text-ink">Alt: </dt>
          <dd className="inline text-muted">{alt || "—"}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">Credit: </dt>
          <dd className="inline text-muted">{credit || "—"}</dd>
        </div>
      </dl>
    );
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-2 border-t border-line pt-3">
      <div>
        <label htmlFor={`alt-${id}`} className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Alt text
        </label>
        <input
          id={`alt-${id}`}
          value={state.alt}
          onChange={(event) => setState((current) => ({ ...current, alt: event.target.value }))}
          maxLength={300}
          className="field py-1.5 text-xs"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor={`credit-${id}`} className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Credit
          </label>
          <input
            id={`credit-${id}`}
            value={state.credit}
            onChange={(event) => setState((current) => ({ ...current, credit: event.target.value }))}
            maxLength={200}
            className="field py-1.5 text-xs"
          />
        </div>
        <div>
          <label htmlFor={`caption-${id}`} className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Caption
          </label>
          <input
            id={`caption-${id}`}
            value={state.caption}
            onChange={(event) => setState((current) => ({ ...current, caption: event.target.value }))}
            maxLength={400}
            className="field py-1.5 text-xs"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={state.isPrivate}
          onChange={(event) => setState((current) => ({ ...current, isPrivate: event.target.checked }))}
        />
        Private (only visible when attached to a published story)
      </label>
      {error ? <p className="text-xs text-red-deep">{error}</p> : null}
      {saved ? <p className="text-xs text-success">Saved.</p> : null}
      <button type="submit" className="btn btn-outline btn-sm" disabled={busy}>
        {busy ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
