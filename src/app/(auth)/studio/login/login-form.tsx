"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/studio";
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });
      if (result.error) {
        setError(
          result.error.message ??
            "We could not sign you in. Check your email address and password.",
        );
        setSubmitting(false);
        return;
      }
      const data = result.data as { twoFactorRedirect?: boolean } | null;
      const target = safeNext(next);
      if (data?.twoFactorRedirect) {
        router.push(`/studio/two-factor?next=${encodeURIComponent(target)}`);
      } else {
        router.push(target);
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field"
          aria-invalid={error ? true : undefined}
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="mb-1 text-xs font-semibold text-navy hover:text-red"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field"
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? (
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs leading-relaxed text-muted">
        Privileged accounts require two-factor authentication. Sessions end automatically after 8
        hours of inactivity.
      </p>
    </form>
  );
}
