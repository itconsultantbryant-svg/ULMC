import type { Metadata } from "next";
import { requirePagePermission } from "@/server/session";
import { readSiteSettings } from "@/server/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  await requirePagePermission("settings.manage", "/studio/settings");
  const settings = await readSiteSettings();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="kicker">Administration</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Institution details, social profiles and policy defaults. Changes are recorded in the audit log.
        </p>
      </header>
      <SettingsForm initial={settings} />
    </div>
  );
}
