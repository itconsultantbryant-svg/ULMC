"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Use at least 12 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(result.error.message ?? "This link is invalid or has expired.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-4 rounded border border-line bg-mist px-3 py-2 text-sm text-muted">
        This page is missing a reset token. Use the link in your email.
      </p>
    );
  }

  if (done) {
    return (
      <div role="status" className="mt-6 rounded border border-success/30 bg-success-tint p-4 text-sm text-success">
        <p className="font-semibold">Password updated</p>
        <p className="mt-1">
          <Link href="/studio/login" className="underline">
            Sign in
          </Link>{" "}
          with your new password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="new-password" className="label">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="label">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="field"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-deep">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
