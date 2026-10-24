"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteForm({
  token,
  defaultName,
  email,
}: {
  token: string;
  defaultName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      const response = await fetch("/api/studio/users/accept-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not create your account.");
        setBusy(false);
        return;
      }
      router.push(`/studio/login?email=${encodeURIComponent(email)}&created=1`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Full name
        </label>
        <input
          id="name"
          required
          minLength={2}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
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
        <label htmlFor="confirm" className="label">
          Confirm password
        </label>
        <input
          id="confirm"
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
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
