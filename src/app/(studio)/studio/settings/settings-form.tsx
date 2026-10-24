"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/server/settings";

type SocialKey = keyof SiteSettings["social"];

const SOCIAL_FIELDS: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "x", label: "X / Twitter", placeholder: "https://x.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/…" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/…" },
];

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setSocial(key: SocialKey, value: string) {
    setSaved(false);
    setForm((current) => ({ ...current, social: { ...current.social, [key]: value } }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/studio/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save settings.");
        setBusy(false);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg">Institution</h2>
        <p className="mb-4 text-xs text-muted">Shown in the site header, footer and metadata.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="siteName" className="label">Site name</label>
            <input id="siteName" className="field" value={form.siteName} onChange={(e) => set("siteName", e.target.value)} required />
          </div>
          <div>
            <label htmlFor="institutionName" className="label">Institution</label>
            <input id="institutionName" className="field" value={form.institutionName} onChange={(e) => set("institutionName", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tagline" className="label">Tagline</label>
            <textarea id="tagline" rows={2} className="field" maxLength={240} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </div>
          <div>
            <label htmlFor="contactEmail" className="label">Contact email</label>
            <input id="contactEmail" type="email" className="field" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </div>
          <div>
            <label htmlFor="contactPhone" className="label">Contact phone</label>
            <input id="contactPhone" className="field" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="label">Address</label>
            <input id="address" className="field" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label htmlFor="universityUrl" className="label">University website</label>
            <input id="universityUrl" type="url" className="field" value={form.universityUrl} onChange={(e) => set("universityUrl", e.target.value)} />
          </div>
          <div>
            <label htmlFor="admissionsUrl" className="label">Admissions page</label>
            <input id="admissionsUrl" type="url" className="field" value={form.admissionsUrl} onChange={(e) => set("admissionsUrl", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg">Social profiles</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={`social-${field.key}`} className="label">{field.label}</label>
              <input
                id={`social-${field.key}`}
                type="url"
                className="field"
                placeholder={field.placeholder}
                value={form.social[field.key]}
                onChange={(e) => setSocial(field.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg">Editorial and security policy</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={form.requireMfaForPrivileged} onChange={(e) => set("requireMfaForPrivileged", e.target.checked)} />
            <span>
              <span className="font-semibold">Require two-factor for editors and administrators.</span>
              <span className="block text-xs text-muted">Privileged accounts are sent to security setup before they can use the studio.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={form.newsletterEnabled} onChange={(e) => set("newsletterEnabled", e.target.checked)} />
            <span>
              <span className="font-semibold">Enable newsletter sign-up.</span>
              <span className="block text-xs text-muted">Double opt-in is always used when enabled.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={form.announcementEnabled} onChange={(e) => set("announcementEnabled", e.target.checked)} />
            <span>
              <span className="font-semibold">Show site announcements.</span>
              <span className="block text-xs text-muted">Active announcements appear in the public header.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={form.showDemoAnalytics} onChange={(e) => set("showDemoAnalytics", e.target.checked)} />
            <span>
              <span className="font-semibold">Include labelled sample analytics.</span>
              <span className="block text-xs text-muted">Clearly marked as demo data; disable before launch with real traffic.</span>
            </span>
          </label>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="commentsAutoCloseDays" className="label">Close comments after (days)</label>
            <input id="commentsAutoCloseDays" type="number" min={0} max={365} className="field" value={form.commentsAutoCloseDays} onChange={(e) => set("commentsAutoCloseDays", Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="activeWindowMinutes" className="label">Live visitor window (minutes)</label>
            <input id="activeWindowMinutes" type="number" min={1} max={60} className="field" value={form.activeWindowMinutes} onChange={(e) => set("activeWindowMinutes", Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="analyticsRetentionDays" className="label">Analytics retention (days)</label>
            <input id="analyticsRetentionDays" type="number" min={7} max={3650} className="field" value={form.analyticsRetentionDays} onChange={(e) => set("analyticsRetentionDays", Number(e.target.value))} />
          </div>
        </div>
      </section>

      {error ? (
        <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">{error}</p>
      ) : null}
      {saved ? (
        <p role="status" className="rounded border border-success/30 bg-success-tint px-3 py-2 text-sm text-success">
          Settings saved. Public pages refresh within a minute.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
