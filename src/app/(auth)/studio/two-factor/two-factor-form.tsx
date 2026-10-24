"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/studio";
}

export function TwoFactorForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result =
        mode === "totp"
          ? await authClient.twoFactor.verifyTotp({ code: code.trim() })
          : await authClient.twoFactor.verifyBackupCode({ code: code.trim() });

      if (result.error) {
        setError(result.error.message ?? "That code was not accepted. Try again.");
        setSubmitting(false);
        return;
      }
      const target = safeNext(next);
      router.push(target);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="code" className="label">
          {mode === "totp" ? "Authentication code" : "Backup code"}
        </label>
        <input
          id="code"
          name="code"
          inputMode={mode === "totp" ? "numeric" : "text"}
          autoComplete="one-time-code"
          autoFocus
          required
          pattern={mode === "totp" ? "[0-9]{6}" : undefined}
          maxLength={mode === "totp" ? 6 : 24}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="field text-center font-mono text-xl tracking-[0.4em]"
          placeholder={mode === "totp" ? "000000" : "XXXX-XXXX"}
        />
      </div>
      {error ? (
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? "Verifying…" : "Verify and continue"}
      </button>
      <button
        type="button"
        className="w-full text-center text-sm text-navy underline underline-offset-4 hover:text-red"
        onClick={() => {
          setMode((value) => (value === "totp" ? "backup" : "totp"));
          setCode("");
          setError("");
        }}
      >
        {mode === "totp" ? "Use a backup code instead" : "Use your authenticator app"}
      </button>
    </form>
  );
}
