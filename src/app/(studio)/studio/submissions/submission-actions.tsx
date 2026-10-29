"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubmissionActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(nextStatus: "reviewed" | "closed") {
    setBusy(true);
    try {
      const response = await fetch(`/api/studio/submissions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "new" ? (
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => update("reviewed")}>
          Mark reviewed
        </button>
      ) : null}
      {status !== "closed" ? (
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => update("closed")}>
          Close
        </button>
      ) : null}
    </div>
  );
}
