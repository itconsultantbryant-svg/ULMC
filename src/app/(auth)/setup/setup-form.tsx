"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetupForm({ token: initialToken }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState("");
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
    setBusy(true);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, email, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Setup failed.");
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
        <label htmlFor="setup-name" className="label">Full name</label>
        <input id="setup-name" className="field" required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="setup-email" className="label">Email</label>
        <input id="setup-email" type="email" className="field" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="setup-password" className="label">Password</label>
        <input id="setup-password" type="password" className="field" required minLength={12} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label htmlFor="setup-confirm" className="label">Confirm password</label>
        <input id="setup-confirm" type="password" className="field" required minLength={12} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <div>
        <label htmlFor="setup-token" className="label">Setup token</label>
        <input id="setup-token" className="field font-mono text-xs" required defaultValue={token} onChange={(e) => setToken(e.target.value)} />
        <p className="mt-1 text-[11px] text-muted">Found in .data/setup-token.txt or the SETUP_TOKEN environment variable.</p>
      </div>
      {error ? <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create super administrator"}
      </button>
    </form>
  );
}
