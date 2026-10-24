import type { Metadata } from "next";
import Link from "next/link";
import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = {
  title: "Two-factor verification",
  robots: { index: false, follow: false },
};

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/studio" } = await searchParams;
  return (
    <div>
      <p className="kicker">Account security</p>
      <h1 className="mt-1 text-3xl leading-tight">Two-factor verification</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the six-digit code from your authenticator app, or use one of your saved backup codes.
      </p>
      <TwoFactorForm next={next} />
      <p className="mt-6 text-sm">
        <Link href="/studio/login" className="text-navy underline underline-offset-4 hover:text-red">
          Start over
        </Link>
      </p>
    </div>
  );
}
