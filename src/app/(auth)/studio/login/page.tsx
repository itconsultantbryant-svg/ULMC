import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/studio" } = await searchParams;
  return (
    <div>
      <p className="kicker">Staff access</p>
      <h1 className="mt-1 text-3xl leading-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Use the email address and password issued through your department invitation.
      </p>
      <LoginForm next={next} />
      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/studio/forgot-password" className="text-navy underline underline-offset-4 hover:text-red">
          Forgot your password?
        </Link>
        <Link href="/contact" className="text-muted hover:text-navy">
          Need access?
        </Link>
      </div>
    </div>
  );
}
