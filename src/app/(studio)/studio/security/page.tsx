import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/server/session";
import { PasswordSettings } from "./password-settings";

export const metadata: Metadata = {
  title: "Account security",
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  const { user } = await requirePageUser("/studio/security");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="kicker">Account</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Security</h1>
        <p className="mt-1 text-sm text-muted">
          Manage password and access for <strong className="text-ink">{user.email}</strong>.
        </p>
      </header>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg">Change password</h2>
        <div className="mt-4">
          <PasswordSettings />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 text-sm">
        <h2 className="text-lg">Session and access</h2>
        <dl className="mt-3 space-y-2">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Password changes take effect immediately and end other active sessions. All access changes
          are recorded in the audit log.
        </p>
        <Link href="/studio" className="btn btn-outline btn-sm mt-4">
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
