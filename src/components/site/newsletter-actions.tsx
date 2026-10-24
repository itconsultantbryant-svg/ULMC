"use client";

import { useState } from "react";

export function ConfirmSubscription({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function confirm() {
    setState("pending");
    try {
      const response = await fetch("/api/newsletter/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState("error");
        setMessage(payload.error ?? "This confirmation link is invalid or has expired.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (!token) {
    return (
      <p className="rounded border border-line bg-mist px-4 py-3 text-sm text-muted">
        This link is missing a confirmation token. Please use the link in your email.
      </p>
    );
  }

  if (state === "done") {
    return (
      <div role="status" className="rounded border border-success/30 bg-success-tint px-4 py-3 text-sm text-success">
        <p className="font-semibold">Subscription confirmed</p>
        <p className="mt-1">Thank you. You will receive occasional department updates.</p>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={confirm} className="btn btn-primary" disabled={state === "pending"}>
        {state === "pending" ? "Confirming…" : "Confirm subscription"}
      </button>
      {state === "error" ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-deep">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function Unsubscribe({ id, sig }: { id: string; sig: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function unsubscribe() {
    setState("pending");
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, sig }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState("error");
        setMessage(payload.error ?? "This unsubscribe link is invalid.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (!id || !sig) {
    return (
      <p className="rounded border border-line bg-mist px-4 py-3 text-sm text-muted">
        This link is incomplete. Please use the unsubscribe link in your email.
      </p>
    );
  }

  if (state === "done") {
    return (
      <div role="status" className="rounded border border-success/30 bg-success-tint px-4 py-3 text-sm text-success">
        You have been unsubscribed. You will not receive further newsletter messages.
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={unsubscribe} className="btn btn-outline" disabled={state === "pending"}>
        {state === "pending" ? "Unsubscribing…" : "Unsubscribe"}
      </button>
      {state === "error" ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-deep">
          {message}
        </p>
      ) : null}
    </div>
  );
}
