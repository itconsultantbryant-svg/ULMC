import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/server/session";
import { readSiteSettings } from "@/server/settings";
import { isPrivileged } from "@/server/permissions";
import { MfaSettings } from "./mfa-settings";

export const metadata: Metadata = {
  title: "Account security",
  robots: { index: false, follow: false },
};

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const { user } = await requirePageUser("/studio/security");
  const { required } = await searchParams;
  const settings = await readSiteSettings();
  const enforced = settings.requireMfaForPrivileged && isPrivileged(user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="kicker">Account</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Security</h1>
        <p className="mt-1 text-sm text-muted">
          Manage two-factor authentication for <strong className="text-ink">{user.email}</strong>.
        </p>
      </header>

      {required === "1" && !user.twoFactorEnabled ? (
        <div className="rounded border border-warning/40 bg-warning-tint px-4 py-3 text-sm text-warning">
          Two-factor setup is required for your role before you can open other parts of the
          workspace.
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg">Two-factor authentication</h2>
        <div className="mt-4">
          <MfaSettings enabled={user.twoFactorEnabled} required={enforced} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 text-sm">
        <h2 className="text-lg">Session and access</h2>
        <dl className="mt-3 space-y-2">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Role</dt>
            <dd>{user.role}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">MFA status</dt>
            <dd>{user.twoFactorEnabled ? "Enabled" : "Not enabled"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          If you lose access to your authenticator and backup codes, contact a super administrator to
          reset access. All security changes are recorded in the audit log.
        </p>
        <Link href="/studio" className="btn btn-outline btn-sm mt-4">
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
