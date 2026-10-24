import type { Metadata } from "next";
import Link from "next/link";
import { setupStatus } from "@/server/setup";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = {
  title: "First-time setup",
  robots: { index: false, follow: false },
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const status = await setupStatus();

  if (!status.needsSetup) {
    return (
      <div>
        <p className="kicker">Setup</p>
        <h1 className="mt-1 text-3xl leading-tight">Already configured</h1>
        <p className="mt-2 text-sm text-muted">
          This workspace already has accounts. Sign in to continue, or ask a super administrator for access.
        </p>
        <Link href="/studio/login" className="btn btn-primary mt-6">Go to sign in</Link>
      </div>
    );
  }

  if (!status.tokenConfigured) {
    return (
      <div>
        <p className="kicker">Setup</p>
        <h1 className="mt-1 text-3xl leading-tight">Setup is disabled</h1>
        <p className="mt-2 text-sm text-muted">
          Set <code className="font-mono text-xs">SETUP_TOKEN</code> in the environment, restart the app and reload this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="kicker">First-time setup</p>
      <h1 className="mt-1 text-3xl leading-tight">Create the super administrator</h1>
      <p className="mt-2 text-sm text-muted">
        This form works once, while the workspace has no accounts. The new account can invite editors and
        administrators, and must enable two-factor authentication at first sign-in.
      </p>
      <SetupForm token={token} />
      <p className="mt-6 text-sm">
        <Link href="/studio/login" className="text-navy underline underline-offset-4 hover:text-red">
          Already set up? Sign in
        </Link>
      </p>
    </div>
  );
}
