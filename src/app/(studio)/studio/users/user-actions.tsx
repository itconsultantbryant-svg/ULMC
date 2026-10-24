"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserActions({
  id,
  role,
  banned,
  isSelf,
  canManageRoles,
  canManage,
}: {
  id: string;
  role: string;
  banned: boolean;
  isSelf: boolean;
  canManageRoles: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(payload: Record<string, unknown>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/studio/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not update the account.");
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

  if (!canManage || isSelf) {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {canManageRoles ? (
        <label className="sr-only" htmlFor={`role-${id}`}>
          Role
        </label>
      ) : null}
      {canManageRoles ? (
        <select
          id={`role-${id}`}
          value={role.includes(",") ? role.split(",")[0] : role}
          onChange={(event) => void patch({ role: event.target.value })}
          disabled={busy}
          className="rounded border border-line px-2 py-1 text-xs"
        >
          <option value="staff">Staff</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      ) : null}
      <button
        type="button"
        onClick={() => void patch({ action: "mfa_reset" }, "Reset two-factor authentication for this account?")}
        disabled={busy}
        className="rounded border border-line px-2 py-1 text-xs font-semibold text-ink hover:bg-mist disabled:opacity-50"
      >
        Reset MFA
      </button>
      {banned ? (
        <button
          type="button"
          onClick={() => void patch({ banned: false })}
          disabled={busy}
          className="rounded border border-success/40 px-2 py-1 text-xs font-semibold text-success hover:bg-success-tint disabled:opacity-50"
        >
          Reinstate
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            const reason = window.prompt("Reason for suspension (recorded in the audit log)");
            if (reason === null) return;
            void patch({ banned: true, banReason: reason }, "Suspend this account and end its sessions?");
          }}
          disabled={busy}
          className="rounded border border-red/30 px-2 py-1 text-xs font-semibold text-red-deep hover:bg-red-tint disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {error ? <span className="w-full text-right text-[11px] text-red-deep">{error}</span> : null}
    </div>
  );
}
