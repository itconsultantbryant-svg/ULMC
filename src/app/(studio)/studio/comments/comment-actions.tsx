"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CommentActions({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "reject" | "spam" | "delete") {
    let reason = "";
    if (action === "reject" || action === "spam") {
      const input = window.prompt(
        action === "reject" ? "Reason for rejecting (optional, shared internally)" : "Why is this spam?",
        "",
      );
      if (input === null) return;
      reason = input;
    }
    if (action === "delete" && !window.confirm("Delete this comment permanently from public view?")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/studio/comments/${commentId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not update the comment.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => void act("approve")}
        disabled={busy}
        className="rounded border border-success/40 px-2 py-1 text-xs font-semibold text-success hover:bg-success-tint disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => void act("reject")}
        disabled={busy}
        className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-mist disabled:opacity-50"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() => void act("spam")}
        disabled={busy}
        className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-mist disabled:opacity-50"
      >
        Spam
      </button>
      <button
        type="button"
        onClick={() => void act("delete")}
        disabled={busy}
        className="rounded border border-red/30 px-2 py-1 text-xs font-semibold text-red-deep hover:bg-red-tint disabled:opacity-50"
      >
        Delete
      </button>
      {error ? <span className="text-xs text-red-deep">{error}</span> : null}
    </div>
  );
}
