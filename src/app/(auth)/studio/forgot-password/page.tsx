import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="kicker">Account help</p>
      <h1 className="mt-1 text-3xl leading-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your staff email address. If an account exists, we will send a password reset link.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm">
        <Link href="/studio/login" className="text-navy underline underline-offset-4 hover:text-red">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
