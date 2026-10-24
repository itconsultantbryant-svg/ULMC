"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteForm({ canInviteAdmin }: { canInviteAdmin: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInviteUrl("");
    try {
      const response = await fetch("/api/studio/users/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const result = (await response.json()) as { error?: string; inviteUrl?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not create the invitation.");
        setBusy(false);
        return;
      }
      setInviteUrl(result.inviteUrl ?? "");
      setName("");
      setEmail("");
      setRole("staff");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-white p-5">
      <h2 className="text-lg">Invite a staff member</h2>
      <p className="text-xs text-muted">
        Invitations expire after 7 days. The recipient sets their own password. New accounts start
        without two-factor and, if privileged, are required to enable it at first sign-in.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="invite-name" className="label">
            Name
          </label>
          <input
            id="invite-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
            required
            minLength={2}
          />
        </div>
        <div>
          <label htmlFor="invite-email" className="label">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="label">
            Role
          </label>
          <select id="invite-role" value={role} onChange={(event) => setRole(event.target.value)} className="field">
            <option value="staff">Staff writer</option>
            <option value="editor">Editor</option>
            {canInviteAdmin ? <option value="admin">Administrator</option> : null}
          </select>
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          {error}
        </p>
      ) : null}
      {inviteUrl ? (
        <div className="rounded border border-success/30 bg-success-tint px-3 py-2 text-xs text-success">
          <p className="font-semibold">Invitation created and email queued.</p>
          <p className="mt-1 break-all font-mono text-[11px]">{inviteUrl}</p>
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}
