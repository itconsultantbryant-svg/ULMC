"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type EnableResult = { totpURI?: string; backupCodes?: string[] };

export function MfaSettings({
  enabled,
  required,
}: {
  enabled: boolean;
  required: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [uri, setUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<"idle" | "verify" | "done">("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const secret = (() => {
    if (!uri) return "";
    try {
      return new URL(uri).searchParams.get("secret") ?? "";
    } catch {
      return "";
    }
  })();

  async function startSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        setError(result.error.message ?? "Could not start two-factor setup.");
        setBusy(false);
        return;
      }
      const data = result.data as EnableResult | null;
      if (!data?.totpURI) {
        setError("The authenticator setup could not be created. Try again.");
        setBusy(false);
        return;
      }
      setUri(data.totpURI);
      setBackupCodes(data.backupCodes ?? []);
      setStep("verify");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: code.trim() });
      if (result.error) {
        setError(result.error.message ?? "That code was not accepted. Check your app and try again.");
        setBusy(false);
        return;
      }
      setStep("done");
      setMessage("Two-factor authentication is now active on your account.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(result.error.message ?? "Could not disable two-factor authentication.");
        setBusy(false);
        return;
      }
      setPassword("");
      setMessage("Two-factor authentication has been disabled.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error) {
        setError(result.error.message ?? "Could not generate backup codes.");
        setBusy(false);
        return;
      }
      const data = result.data as { backupCodes?: string[] } | null;
      setBackupCodes(data?.backupCodes ?? []);
      setPassword("");
      setMessage("New backup codes generated. Previous codes no longer work.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" || (enabled && step === "idle")) {
    return (
      <div className="space-y-5">
        <div className="rounded border border-success/30 bg-success-tint px-4 py-3 text-sm text-success">
          <p className="font-semibold">Two-factor authentication is active</p>
          <p className="mt-1">
            You will be asked for a code from your authenticator app when signing in.
          </p>
        </div>

        {backupCodes.length > 0 ? (
          <div className="rounded border border-warning/40 bg-warning-tint p-4">
            <p className="text-sm font-semibold text-warning">Save these backup codes now</p>
            <p className="mt-1 text-xs text-ink">
              Each code can be used once if you lose access to your authenticator. They are shown only
              this time.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((backup) => (
                <li key={backup} className="rounded bg-white px-2 py-1">
                  {backup}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {message ? <p className="text-sm font-semibold text-success">{message}</p> : null}

        <form onSubmit={regenerate} className="space-y-3 rounded border border-line p-4">
          <p className="text-sm font-semibold text-ink">Regenerate backup codes</p>
          <div>
            <label htmlFor="regen-password" className="label">
              Confirm password
            </label>
            <input
              id="regen-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
            />
          </div>
          <button type="submit" className="btn btn-outline btn-sm" disabled={busy || !password}>
            Generate new backup codes
          </button>
        </form>

        {!required ? (
          <form onSubmit={disable} className="space-y-3 rounded border border-red/20 p-4">
            <p className="text-sm font-semibold text-red-deep">Disable two-factor authentication</p>
            <p className="text-xs text-muted">
              This reduces the security of your account. Department policy may require two-factor for
              privileged roles.
            </p>
            <div>
              <label htmlFor="disable-password" className="label">
                Confirm password
              </label>
              <input
                id="disable-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field"
              />
            </div>
            <button type="submit" className="btn btn-outline btn-sm" disabled={busy || !password}>
              Disable two-factor
            </button>
          </form>
        ) : (
          <p className="text-xs text-muted">
            Your role requires two-factor authentication, so it cannot be disabled here.
          </p>
        )}
        {error ? (
          <p role="alert" className="text-sm font-semibold text-red-deep">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form onSubmit={confirmSetup} className="space-y-4">
        <div className="rounded border border-line bg-mist p-4">
          <p className="text-sm font-semibold text-ink">1. Add this account to your authenticator app</p>
          <p className="mt-1 text-xs text-muted">
            Open your authenticator (Google Authenticator, 1Password, Authy or similar) and add a
            time-based account using this setup URI or secret.
          </p>
          <p className="mt-2 break-all rounded bg-white p-2 font-mono text-[11px] text-ink">{uri}</p>
          {secret ? (
            <p className="mt-2 text-xs text-muted">
              Manual secret: <span className="font-mono text-ink">{secret}</span>
            </p>
          ) : null}
        </div>

        {backupCodes.length > 0 ? (
          <div className="rounded border border-warning/40 bg-warning-tint p-4">
            <p className="text-sm font-semibold text-warning">2. Save your backup codes</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
              {backupCodes.map((backup) => (
                <li key={backup}>{backup}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">These will not be shown again after setup.</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="verify-code" className="label">
            3. Enter the six-digit code from your app
          </label>
          <input
            id="verify-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="field text-center font-mono text-xl tracking-[0.4em]"
            placeholder="000000"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Activate two-factor"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setStep("idle");
              setUri("");
              setBackupCodes([]);
              setCode("");
              setError("");
            }}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={startSetup} className="space-y-4">
      <div className="rounded border border-line bg-mist px-4 py-3 text-sm leading-relaxed text-muted">
        Two-factor authentication adds a second step when you sign in. You will need an authenticator
        app on your phone or computer. Setup takes about two minutes.
        {required ? (
          <span className="mt-2 block font-semibold text-red-deep">
            Your role requires two-factor authentication before you can use the workspace.
          </span>
        ) : null}
      </div>
      <div>
        <label htmlFor="setup-password" className="label">
          Confirm your password to begin
        </label>
        <input
          id="setup-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-deep">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy || !password}>
        {busy ? "Preparing…" : "Set up two-factor authentication"}
      </button>
    </form>
  );
}
