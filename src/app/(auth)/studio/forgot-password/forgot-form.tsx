"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/studio/reset-password`,
      });
      if (result.error) {
        setError(result.error.message ?? "We could not process the request.");
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="mt-6 rounded border border-success/30 bg-success-tint p-4 text-sm text-success">
        If an account exists for that address, a reset link has been sent. Check your inbox and spam
        folder. The link expires in one hour.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-deep">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
