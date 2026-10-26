"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword.length < 12) {
      setError("Use a password of at least 12 characters.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not update your password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated. Other active sessions have been signed out.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">Update your password immediately. Other active sessions will be signed out.</p>
      <div>
        <label htmlFor="current-password" className="label">Current password</label>
        <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-password" className="label">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="label">Confirm new password</label>
          <input id="confirm-new-password" type="password" autoComplete="new-password" required minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field" />
        </div>
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-red-deep">{error}</p> : null}
      {message ? <p role="status" className="text-sm font-semibold text-success">{message}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
    </form>
  );
}
