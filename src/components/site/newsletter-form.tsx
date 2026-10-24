"use client";

import Link from "next/link";
import { useState } from "react";

type State = { status: "idle" | "submitting" | "success" | "error"; message?: string };

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "submitting" });
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name: String(form.get("name") ?? ""),
          company: String(form.get("company") ?? ""),
          consent,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) {
        setState({ status: "error", message: payload.error ?? "We could not add your address. Please try again." });
        return;
      }
      setState({
        status: "success",
        message: payload.message ?? "Check your inbox to confirm your subscription.",
      });
      setEmail("");
      setConsent(false);
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-md border border-success/30 bg-success-tint px-4 py-3 text-sm text-success"
      >
        {state.message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-2" : "space-y-3"} noValidate>
      <div className={compact ? "space-y-2" : "flex flex-col gap-2 sm:flex-row"}>
        <label htmlFor={compact ? "newsletter-email-compact" : "newsletter-email"} className="sr-only">
          Email address
        </label>
        <input
          id={compact ? "newsletter-email-compact" : "newsletter-email"}
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="field bg-white"
          aria-invalid={state.status === "error" ? true : undefined}
        />
        <button
          type="submit"
          className="btn btn-red flex-none"
          disabled={state.status === "submitting" || !consent}
        >
          {state.status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor={compact ? "company-compact" : "company"}>Company</label>
        <input id={compact ? "company-compact" : "company"} name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 flex-none accent-[#10104F]"
          required
        />
        <span>
          I agree to receive occasional email updates from the department. I can unsubscribe at any
          time. See the <Link href="/privacy" className="underline">privacy notice</Link>.
        </span>
      </label>
      {state.status === "error" ? (
        <p role="alert" className="text-xs font-semibold text-red-deep">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
