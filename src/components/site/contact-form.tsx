"use client";

import Link from "next/link";
import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          subject: String(form.get("subject") ?? ""),
          body: String(form.get("message") ?? ""),
          website: String(form.get("website") ?? ""),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error ?? "We could not send your message. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(payload.message ?? "Thank you. Your message has been received.");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-md border border-success/30 bg-success-tint p-5 text-sm text-success">
        <p className="font-semibold">Message received</p>
        <p className="mt-1">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="label">
            Your name
          </label>
          <input id="contact-name" name="name" required maxLength={120} autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="contact-email" className="label">
            Email address
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className="field"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="label">
          Subject
        </label>
        <select id="contact-subject" name="subject" className="field" required defaultValue="General enquiry">
          <option>General enquiry</option>
          <option>Academic programme</option>
          <option>Student journalism</option>
          <option>Newsroom correction</option>
          <option>Event or announcement</option>
          <option>Media request</option>
          <option>Accessibility feedback</option>
        </select>
      </div>
      <div>
        <label htmlFor="contact-message" className="label">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={6000}
          rows={7}
          className="field resize-y"
        />
        <p className="help">Please do not include sensitive personal information.</p>
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" ? (
        <p role="alert" className="text-sm font-semibold text-red-deep">
          {message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs leading-relaxed text-muted">
        Messages are delivered to the department&apos;s editorial and administrative team. We aim to
        respond during normal working hours. See the <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
    </form>
  );
}
