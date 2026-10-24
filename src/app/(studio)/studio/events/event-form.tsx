"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toDateTimeLocal } from "@/lib/format";

export type EventFormValues = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  descriptionHtml: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  organizer: string;
  registrationUrl: string;
  isPublished: boolean;
  isFeatured: boolean;
};

function plainToHtml(value: string): string {
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function htmlToPlain(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function EventForm({
  initial,
  timezone,
}: {
  initial: EventFormValues;
  timezone: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [description, setDescription] = useState(htmlToPlain(initial.descriptionHtml));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      descriptionHtml: plainToHtml(description),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };
    try {
      const response = await fetch(
        form.id ? `/api/studio/events/${form.id}` : "/api/studio/events",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save the event.");
        setBusy(false);
        return;
      }
      router.push("/studio/events");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!form.id) return;
    if (!window.confirm("Delete this event permanently? This cannot be undone.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/studio/events/${form.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not delete the event.");
        setBusy(false);
        return;
      }
      router.push("/studio/events");
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  const local = (value: Date | string) => toDateTimeLocal(value);

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="event-title" className="label">
            Title
          </label>
          <input
            id="event-title"
            required
            minLength={3}
            maxLength={180}
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            className="field font-serif text-lg"
          />
        </div>
        <div>
          <label htmlFor="event-slug" className="label">
            URL slug
          </label>
          <input
            id="event-slug"
            value={form.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="auto-generated from title"
            className="field font-mono text-xs"
          />
        </div>
        <div>
          <label htmlFor="event-venue" className="label">
            Venue
          </label>
          <input
            id="event-venue"
            value={form.venue}
            onChange={(event) => set("venue", event.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="event-start" className="label">
            Starts ({timezone})
          </label>
          <input
            id="event-start"
            type="datetime-local"
            required
            value={form.startsAt ? local(form.startsAt) : ""}
            onChange={(event) => set("startsAt", event.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="event-end" className="label">
            Ends (optional)
          </label>
          <input
            id="event-end"
            type="datetime-local"
            value={form.endsAt ? local(form.endsAt) : ""}
            onChange={(event) => set("endsAt", event.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="event-organizer" className="label">
            Organiser
          </label>
          <input
            id="event-organizer"
            value={form.organizer}
            onChange={(event) => set("organizer", event.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="event-registration" className="label">
            Registration URL
          </label>
          <input
            id="event-registration"
            type="url"
            value={form.registrationUrl}
            onChange={(event) => set("registrationUrl", event.target.value)}
            placeholder="https://…"
            className="field"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="event-summary" className="label">
            Summary
          </label>
          <textarea
            id="event-summary"
            rows={3}
            maxLength={600}
            value={form.summary}
            onChange={(event) => set("summary", event.target.value)}
            className="field"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="event-description" className="label">
            Description
          </label>
          <textarea
            id="event-description"
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="field"
            placeholder="Details, speakers, agenda. Blank line separates paragraphs."
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(event) => set("isPublished", event.target.checked)}
          />
          Published
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(event) => set("isFeatured", event.target.checked)}
          />
          Featured
        </label>
      </div>

      {error ? (
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        {form.id ? (
          <button type="button" onClick={remove} disabled={busy} className="text-xs font-semibold text-red-deep hover:underline">
            Delete event
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/studio/events")} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : form.id ? "Save changes" : "Create event"}
          </button>
        </div>
      </div>
    </form>
  );
}
