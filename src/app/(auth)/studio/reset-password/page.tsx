import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error } = await searchParams;

  return (
    <div>
      <p className="kicker">Account security</p>
      <h1 className="mt-1 text-3xl leading-tight">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted">
        Use at least 12 characters. A longer passphrase is easier to remember and harder to guess.
      </p>
      {error ? (
        <p role="alert" className="mt-4 rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
          This reset link is invalid or has expired. Request a new one.
        </p>
      ) : (
        <ResetPasswordForm token={token} />
      )}
      <p className="mt-6 text-sm">
        <Link href="/studio/forgot-password" className="text-navy underline underline-offset-4 hover:text-red">
          Request a new link
        </Link>
      </p>
    </div>
  );
}
